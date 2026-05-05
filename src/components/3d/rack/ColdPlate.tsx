import { M } from '../materials'

/**
 * 液冷冷板：覆盖在 GPU/CPU 上方的金属冷板，与 quick-disconnect 接头连接到 manifold。
 * NVL72 中所有 compute tray + NVSwitch tray 都是液冷的。
 */
interface ColdPlateProps {
  position?: [number, number, number]
  /** 冷板尺寸：宽 × 深 */
  size?: [number, number]
  /** 冷板厚度 */
  thickness?: number
  /** 是否显示 quick-disconnect 接头 */
  showConnectors?: boolean
}

export function ColdPlate({
  position = [0, 0, 0],
  size = [0.5, 0.3],
  thickness = 0.01,
  showConnectors = true,
}: ColdPlateProps) {
  const [w, d] = size
  return (
    <group position={position}>
      <mesh material={M.heatsinkAlu} position={[0, thickness / 2, 0]}>
        <boxGeometry args={[w, thickness, d]} />
      </mesh>
      {/* 内部流道槽 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={i}
          material={M.coolantCold}
          position={[
            -w / 2 + 0.02 + i * ((w - 0.04) / 5),
            thickness + 0.0003,
            0,
          ]}
        >
          <boxGeometry args={[0.004, 0.0006, d * 0.85]} />
        </mesh>
      ))}
      {showConnectors ? (
        <>
          <mesh
            material={M.coolantCold}
            position={[-w / 2 + 0.025, thickness + 0.005, -d / 2 - 0.005]}
          >
            <cylinderGeometry args={[0.008, 0.008, 0.018, 12]} />
          </mesh>
          <mesh
            material={M.coolantHot}
            position={[w / 2 - 0.025, thickness + 0.005, -d / 2 - 0.005]}
          >
            <cylinderGeometry args={[0.008, 0.008, 0.018, 12]} />
          </mesh>
        </>
      ) : null}
    </group>
  )
}
