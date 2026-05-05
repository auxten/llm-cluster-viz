import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { FlowParticles } from '../components/3d/flow/FlowParticles'
import { useStepGate } from './useStepGate'
import { useT } from '../i18n'

/**
 * S1: 一个 Token 的旅行 (chip 层叠加)
 *
 * 在 SuperchipBoard 上方画出：
 *  - input embedding（左侧浮空小球）
 *  - router gate（中间一个发光节点，每秒决定 top-k 路由）
 *  - 8 个 expert（分布在 2 颗 B200 上，每颗 4 个）
 *  - 上行 all-to-all 曲线 + 下行 gather 曲线
 *  - 输出（右侧浮空小球）
 *
 * 每个 step 调整曲线显隐与流粒子密度，用 storyStore.stepIndex 决定。
 */

export function StorylineS1() {
  const gate = useStepGate('i1_token_journey')
  const t = useT()

  // 设备坐标（以 SuperchipBoard 中心为原点）
  const inputPt = useMemo(() => new THREE.Vector3(-0.45, 0.18, 0), [])
  const routerPt = useMemo(() => new THREE.Vector3(0, 0.22, 0), [])
  const outputPt = useMemo(() => new THREE.Vector3(0.45, 0.18, 0), [])

  // 8 个 expert 的位置：在 2 颗 B200 die 周围分布
  const expertPts = useMemo(() => {
    const pts: THREE.Vector3[] = []
    // gpu0 (-w/4) 和 gpu1 (+w/4) 各 4 个
    for (const baseX of [-0.14, 0.14]) {
      for (const dx of [-0.04, 0.04]) {
        for (const dz of [-0.04, 0.04]) {
          pts.push(new THREE.Vector3(baseX + dx, 0.05, dz + 0.05))
        }
      }
    }
    return pts.slice(0, 8)
  }, [])

  // 路由曲线：input → router
  const inputCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      inputPt,
      new THREE.Vector3(-0.22, 0.24, 0),
      routerPt,
    ])
  }, [inputPt, routerPt])

  // router → 8 experts
  const fanOutCurves = useMemo(
    () =>
      expertPts.map(
        (ep) =>
          new THREE.QuadraticBezierCurve3(
            routerPt,
            new THREE.Vector3(
              (routerPt.x + ep.x) / 2,
              0.32,
              (routerPt.z + ep.z) / 2,
            ),
            ep,
          ),
      ),
    [expertPts, routerPt],
  )

  // experts → output (gather)
  const gatherCurves = useMemo(
    () =>
      expertPts.map(
        (ep) =>
          new THREE.QuadraticBezierCurve3(
            ep,
            new THREE.Vector3(
              (ep.x + outputPt.x) / 2,
              0.28,
              (ep.z + outputPt.z) / 2,
            ),
            outputPt,
          ),
      ),
    [expertPts, outputPt],
  )

  // 新章节 i1 step 顺序：enter, attention_kv, route, all_to_all, compute, gather, output
  const showRouter = gate.atOrAfter('route')
  const showFanOut = gate.atOrAfter('all_to_all')
  const showCompute = gate.atOrAfter('compute')
  const showGather = gate.atOrAfter('gather')
  const showAttention = gate.is('attention_kv')

  return (
    <group>
      {/* router 节点 */}
      {showRouter ? (
        <group position={routerPt.toArray()}>
          <mesh>
            <sphereGeometry args={[0.022, 16, 16]} />
            <meshStandardMaterial
              color="#c8ff5a"
              emissive="#a4ee27"
              emissiveIntensity={2.0}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
          <Html position={[0, 0.04, 0]} center pointerEvents="none">
            <div className="scene-label scene-label-accent">
              {t('s1.router')}
            </div>
          </Html>
        </group>
      ) : null}

      {/* input 与 output 标签 */}
      <Html position={[inputPt.x, inputPt.y + 0.04, inputPt.z]} center pointerEvents="none">
        <div className="scene-label scene-label-token">{t('s1.tokenIn')}</div>
      </Html>
      <mesh position={inputPt.toArray()}>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshStandardMaterial
          color="#ffd966"
          emissive="#ffd966"
          emissiveIntensity={2.2}
        />
      </mesh>

      {showGather ? (
        <>
          <Html
            position={[outputPt.x, outputPt.y + 0.04, outputPt.z]}
            center
            pointerEvents="none"
          >
            <div className="scene-label scene-label-token">{t('s1.tokenOut')}</div>
          </Html>
          <mesh position={outputPt.toArray()}>
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshStandardMaterial
              color="#ffd966"
              emissive="#ffd966"
              emissiveIntensity={2.2}
            />
          </mesh>
        </>
      ) : null}

      {/* 8 expert 高亮 */}
      {showFanOut
        ? expertPts.map((p, i) => (
            <mesh key={i} position={p.toArray()}>
              <sphereGeometry args={[0.012, 12, 12]} />
              <meshStandardMaterial
                color="#a4ee27"
                emissive="#a4ee27"
                emissiveIntensity={showCompute ? 2.2 : 1.0}
              />
            </mesh>
          ))
        : null}

      {/* input → router 流粒子 */}
      {showRouter ? (
        <FlowParticles
          curves={[inputCurve]}
          perCurve={3}
          speed={0.6}
          color="#ffd966"
          size={0.014}
        />
      ) : null}

      {/* fan-out 流粒子 */}
      {showFanOut ? (
        <FlowParticles
          curves={fanOutCurves}
          perCurve={2}
          speed={0.5}
          color="#a4ee27"
          size={0.011}
        />
      ) : null}

      {/* gather 流粒子 */}
      {showGather ? (
        <FlowParticles
          curves={gatherCurves}
          perCurve={2}
          speed={0.5}
          color="#ffd966"
          size={0.011}
        />
      ) : null}

      {/* attention_kv 伏笔：HBM 上的某一格高亮橙色，呼应 i4_kv_cache_budget */}
      {showAttention ? (
        <group position={[-0.14, 0.022, 0.16]}>
          <mesh>
            <boxGeometry args={[0.022, 0.008, 0.022]} />
            <meshBasicMaterial color="#ffaa55" transparent opacity={0.9} />
          </mesh>
          <Html position={[0, 0.04, 0]} center pointerEvents="none">
            <div className="scene-label" style={{ color: '#ffaa55' }}>
              {t('s1.kvSlot')}
            </div>
          </Html>
        </group>
      ) : null}
    </group>
  )
}
