import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { FlowParticles } from '../components/3d/flow/FlowParticles'
import { useStepGate } from './useStepGate'
import { NVL72_DIM } from '../components/3d/rack/NVL72Rack'
import { useT } from '../i18n'

/**
 * S3: MoE 在 NVL72 上的 all-to-all (rack 层叠加)
 *
 * 视觉：
 *  - 在 rack 上排列一个简化的 8×8 GPU 网格 (代表 64 GPU 实际使用，留 8 块容错)
 *  - 每个 GPU 是一个发光小方块，标注它持有的 expert id
 *  - 当 step >= 1：上行 all-to-all - 大量曲线从所有 GPU 飞向所有其他 GPU
 *  - 当 step >= 3：跨 rack 惩罚 - 第二个 rack 出现在右侧，跨 rack 流量明显更慢
 *
 * 注意：实际 GPU 在 rack 内是垂直堆叠的，但为了 all-to-all 的可视化清晰度，
 *      我们在 rack 旁边浮空一个 8×8 网格作为"逻辑视图"。
 */

export function StorylineS3() {
  const gate = useStepGate('t3_moe_all_to_all')
  const t = useT()

  // 新 step 顺序：shard, broadcast, compute, reduce, cross_rack_penalty, conclusion
  const showShardLabels = gate.atOrAfter('shard')
  const showAllToAll = gate.atOrAfter('broadcast')
  const showReduce = gate.atOrAfter('reduce')
  const showCrossRack = gate.is('cross_rack_penalty')
  const showConclusion = gate.is('conclusion')

  // 8×8 网格中心位于 rack 左侧（避开右侧 StoryPanel）
  // 缩小 cell + 靠近 rack，使整个 grid 落在视口内
  const gridSize = 8
  const cellSize = 0.13
  const offset = ((gridSize - 1) * cellSize) / 2
  const baseX = -NVL72_DIM.width / 2 - offset - 0.45
  const baseY = NVL72_DIM.height / 2

  const positions = useMemo(() => {
    const arr: { x: number; y: number; z: number; idx: number }[] = []
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        arr.push({
          x: baseX + (j - (gridSize - 1) / 2) * cellSize,
          y: baseY + (i - (gridSize - 1) / 2) * cellSize,
          z: 0,
          idx: i * gridSize + j,
        })
      }
    }
    return arr
  }, [baseX, baseY])

  // 选择 N 条样本曲线（不要画 64*64 = 4096 条，会卡），随机抽 80 条做视觉
  const sampleCurves = useMemo(() => {
    const N = 60
    const curves: THREE.Curve<THREE.Vector3>[] = []
    for (let k = 0; k < N; k++) {
      const a = positions[Math.floor(Math.random() * positions.length)]
      let b = positions[Math.floor(Math.random() * positions.length)]
      while (b.idx === a.idx)
        b = positions[Math.floor(Math.random() * positions.length)]
      const av = new THREE.Vector3(a.x, a.y, a.z)
      const bv = new THREE.Vector3(b.x, b.y, b.z)
      const mid = av
        .clone()
        .add(bv)
        .multiplyScalar(0.5)
        .add(new THREE.Vector3(0, 0, 0.4 + Math.random() * 0.3))
      curves.push(new THREE.QuadraticBezierCurve3(av, mid, bv))
    }
    return curves
  }, [positions])

  // 跨 rack 曲线（去到左边稍远处的 rack 视角，避开右侧 StoryPanel）
  const crossRackOffset = 1.2
  const crossRackCurves = useMemo(() => {
    if (!showCrossRack) return []
    const N = 20
    const curves: THREE.Curve<THREE.Vector3>[] = []
    for (let k = 0; k < N; k++) {
      const a = positions[Math.floor(Math.random() * positions.length)]
      const av = new THREE.Vector3(a.x, a.y, a.z)
      const bv = new THREE.Vector3(
        a.x - crossRackOffset,
        baseY + (Math.random() - 0.5) * 0.9,
        0,
      )
      const mid = av.clone().add(bv).multiplyScalar(0.5)
      mid.y += 0.5
      curves.push(new THREE.QuadraticBezierCurve3(av, mid, bv))
    }
    return curves
  }, [showCrossRack, positions, baseY])

  return (
    <group>
      {/* 8x8 GPU 逻辑网格 */}
      {positions.map((p) => (
        <group key={p.idx} position={[p.x, p.y, p.z]}>
          <mesh>
            <boxGeometry args={[cellSize * 0.7, cellSize * 0.7, 0.04]} />
            <meshStandardMaterial
              color="#3d4658"
              metalness={0.7}
              roughness={0.4}
              emissive="#a4ee27"
              emissiveIntensity={showAllToAll ? 0.7 : 0.3}
            />
          </mesh>
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[cellSize * 0.55, cellSize * 0.55]} />
            <meshBasicMaterial
              color={showAllToAll ? '#a4ee27' : '#5a7028'}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      ))}

      {/* 网格上方标签 */}
      <Html
        position={[baseX, baseY + offset + 0.18, 0]}
        center
        pointerEvents="none"
      >
        <div className="scene-label" style={{ letterSpacing: '0.05em' }}>
          {showShardLabels ? t('s3.shard.title') : t('s3.grid.title')}
        </div>
      </Html>
      {/* 注解：GPU id (0..63) */}
      {positions.map((p) => (
        <Html
          key={`id-${p.idx}`}
          position={[p.x, p.y, p.z + 0.04]}
          center
          pointerEvents="none"
        >
          <div
            style={{
              color: 'var(--color-fg)',
              fontSize: 8.5,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              opacity: 0.85,
              textShadow: '0 1px 2px rgba(0,0,0,0.7)',
            }}
          >
            E{p.idx * 4}–{p.idx * 4 + 3}
          </div>
        </Html>
      ))}

      {/* all-to-all 流粒子 */}
      {showAllToAll ? (
        <FlowParticles
          curves={sampleCurves}
          perCurve={1}
          speed={0.8}
          color="#a4ee27"
          size={0.012}
        />
      ) : null}
      {showReduce ? (
        <FlowParticles
          curves={sampleCurves.slice(0, 30)}
          perCurve={1}
          speed={0.8}
          color="#ffd966"
          size={0.011}
        />
      ) : null}

      {/* 跨 rack 惩罚：慢速蓝色粒子从 grid 左侧飞出，配 IB 警告标签 */}
      {showCrossRack ? (
        <>
          <FlowParticles
            curves={crossRackCurves}
            perCurve={1}
            speed={0.18}
            color="#6cb8ff"
            size={0.014}
          />
          <Html
            position={[baseX - 0.4, baseY + 0.5, 0]}
            center
            pointerEvents="none"
          >
            <div
              style={{
                background: 'rgba(108, 184, 255, 0.22)',
                border: '1px solid rgba(108, 184, 255, 0.7)',
                borderRadius: 6,
                padding: '6px 10px',
                color: '#dcecff',
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.55)',
              }}
            >
              {t('s3.ibPenalty')}
            </div>
          </Html>
        </>
      ) : null}

      {/* conclusion step 总结面板 */}
      {showConclusion ? (
        <Html
          position={[baseX, baseY - offset - 0.25, 0]}
          center
          pointerEvents="none"
        >
          <div
            style={{
              background: 'rgba(164, 238, 39, 0.16)',
              border: '1px solid rgba(164, 238, 39, 0.5)',
              borderRadius: 8,
              padding: '10px 16px',
              color: '#dffaa8',
              fontSize: 13,
              fontWeight: 500,
              minWidth: 460,
              textAlign: 'center',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              boxShadow: '0 2px 14px rgba(0, 0, 0, 0.5)',
            }}
          >
            <strong style={{ color: '#a4ee27' }}>{t('s3.conclusion.title')}</strong>
            <div style={{ marginTop: 4, color: '#c5cdd9' }}>
              {t('s3.conclusion.body1')}
              <br />
              {t('s3.conclusion.body2')}
            </div>
          </div>
        </Html>
      ) : null}
    </group>
  )
}
