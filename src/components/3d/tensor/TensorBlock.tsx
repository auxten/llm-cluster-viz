import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * TensorBlock：一个带"语义颜色 + shape 标签"的小方块/平片。
 *
 * 用来在 3D 场景中表达"GPU 之间到底传的是什么 tensor"，
 * 替代之前抽象的粒子球。
 *
 * 颜色语义（约定）：
 *   activation : #ffd966 (黄)
 *   weights    : #a4ee27 (绿)
 *   gradient   : #a48cff (紫)
 *   kv_cache   : #ffaa55 (橙)
 *   optimizer  : #5ad9c2 (青)
 *   token      : #ffd966 (同 activation)
 */

export type TensorRole =
  | 'activation'
  | 'weights'
  | 'gradient'
  | 'kv_cache'
  | 'optimizer'
  | 'token'

const ROLE_COLORS: Record<TensorRole, string> = {
  activation: '#ffd966',
  weights: '#a4ee27',
  gradient: '#a48cff',
  kv_cache: '#ffaa55',
  optimizer: '#5ad9c2',
  token: '#ffd966',
}

const ROLE_LABELS: Record<TensorRole, string> = {
  activation: 'activation',
  weights: 'W',
  gradient: '∇',
  kv_cache: 'KV',
  optimizer: 'opt',
  token: 'token',
}

export interface TensorBlockProps {
  position: [number, number, number]
  role: TensorRole
  /** 短形状字符串，如 "[B,L,d]" 或 "[2000, 4096]" */
  shape?: string
  /** 角色覆盖标签（不传用 ROLE_LABELS） */
  label?: string
  /** 方块尺寸（米） */
  size?: [number, number, number]
  /** 显隐 */
  visible?: boolean
  /** 让方块呼吸闪烁的强度 0..1，0 = 不闪 */
  pulse?: number
  /** 自定义颜色覆盖 role 颜色 */
  color?: string
  /** 是否在标签上额外显示几个 float 样本 */
  sampleValues?: number[]
  /** 让 tensor 可以从一个点平滑插值到另一个点（动画用） */
  fromPosition?: [number, number, number]
  /** 当前插值进度 0..1，1 表示完全到达 position */
  travel?: number
  /** 透明度 */
  opacity?: number
}

export function TensorBlock({
  position,
  role,
  shape,
  label,
  size = [0.08, 0.04, 0.08],
  visible = true,
  pulse = 0.4,
  color,
  sampleValues,
  fromPosition,
  travel,
  opacity = 0.92,
}: TensorBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const groupRef = useRef<THREE.Group>(null)

  const c = color ?? ROLE_COLORS[role]
  const lbl = label ?? ROLE_LABELS[role]

  useFrame((_, dt) => {
    if (!visible) return
    const t = performance.now() * 0.001

    // pulse 让 emissive 强度呼吸
    if (matRef.current && pulse > 0) {
      const base = 0.6
      matRef.current.emissiveIntensity = base + pulse * (0.4 + 0.4 * Math.sin(t * 2.5))
    }

    // travel 动画：从 fromPosition 插值到 position
    if (groupRef.current && fromPosition && travel != null) {
      const e = THREE.MathUtils.clamp(travel, 0, 1)
      const easeOut = 1 - Math.pow(1 - e, 2.2)
      groupRef.current.position.set(
        THREE.MathUtils.lerp(fromPosition[0], position[0], easeOut),
        THREE.MathUtils.lerp(fromPosition[1], position[1], easeOut),
        THREE.MathUtils.lerp(fromPosition[2], position[2], easeOut),
      )
    } else if (groupRef.current) {
      groupRef.current.position.set(...position)
    }

    void dt
  })

  if (!visible) return null

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={size} />
        <meshStandardMaterial
          ref={matRef}
          color={c}
          emissive={c}
          emissiveIntensity={0.7}
          metalness={0.15}
          roughness={0.45}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {/* 边缘高光 */}
      <mesh>
        <boxGeometry args={[size[0] * 1.06, size[1] * 1.06, size[2] * 1.06]} />
        <meshBasicMaterial color={c} transparent opacity={0.18 * opacity} depthWrite={false} />
      </mesh>
      {/* 标签 */}
      {(shape || lbl || sampleValues) && (
        <Html position={[0, size[1] * 1.6 + 0.01, 0]} center pointerEvents="none">
          <div
            style={{
              background: `${c}1a`,
              border: `1px solid ${c}88`,
              borderRadius: 5,
              padding: '2px 7px',
              color: c,
              fontSize: 9.5,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              textShadow: `0 0 6px ${c}55`,
              lineHeight: 1.2,
            }}
          >
            <span style={{ opacity: 0.9 }}>{lbl}</span>
            {shape ? (
              <span style={{ opacity: 0.7, marginLeft: 4, fontSize: 9 }}>{shape}</span>
            ) : null}
            {sampleValues && sampleValues.length > 0 ? (
              <div style={{ fontSize: 8.5, opacity: 0.7, marginTop: 1 }}>
                [
                {sampleValues
                  .slice(0, 4)
                  .map((v) => v.toFixed(2))
                  .join(', ')}
                {sampleValues.length > 4 ? ', …' : ''}]
              </div>
            ) : null}
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * TensorArrow：在两个 3D 点之间画一个 tensor "传输" 的箭头 + tensor 块在路径上滑动。
 * 用来强调"这个 tensor 正在从这里被发到那里"。
 */
export interface TensorArrowProps {
  from: [number, number, number]
  to: [number, number, number]
  role: TensorRole
  shape?: string
  label?: string
  /** 0..1 当前传输进度（块在路径上的位置） */
  progress: number
  /** 是否显示箭头线（即使没在传也画一条淡线） */
  showLine?: boolean
  size?: [number, number, number]
  color?: string
}

export function TensorArrow({
  from,
  to,
  role,
  shape,
  label,
  progress,
  showLine = true,
  size = [0.06, 0.03, 0.06],
  color,
}: TensorArrowProps) {
  const c = color ?? ROLE_COLORS[role]
  const fromV = new THREE.Vector3(...from)
  const toV = new THREE.Vector3(...to)
  const e = THREE.MathUtils.clamp(progress, 0, 1)
  const easeInOut = e < 0.5
    ? 2 * e * e
    : 1 - Math.pow(-2 * e + 2, 2) / 2
  const cur = fromV.clone().lerp(toV, easeInOut)
  const dir = toV.clone().sub(fromV).normalize()

  // 箭头线（dashed）：用 simple Line 几何
  const lineGeom = new THREE.BufferGeometry().setFromPoints([fromV, toV])

  return (
    <group>
      {showLine ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <primitive object={new THREE.Line(lineGeom, new THREE.LineDashedMaterial({
          color: c,
          dashSize: 0.06,
          gapSize: 0.04,
          transparent: true,
          opacity: 0.45,
        }))} />
      ) : null}
      <TensorBlock
        position={[cur.x, cur.y, cur.z]}
        role={role}
        shape={shape}
        label={label}
        size={size}
        visible={progress > 0.001 && progress < 0.999}
      />
      {/* 终点处一个箭头小三角（指向 dir） */}
      {progress > 0.85 ? (
        <mesh
          position={[toV.x - dir.x * 0.04, toV.y - dir.y * 0.04, toV.z - dir.z * 0.04]}
        >
          <coneGeometry args={[0.025, 0.06, 6]} />
          <meshBasicMaterial color={c} />
        </mesh>
      ) : null}
    </group>
  )
}
