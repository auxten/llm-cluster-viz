import { M } from '../materials'

/**
 * ConnectX-7 NIC + IB-NDR 400 Gbps 光口。
 * 每 compute tray 4 个，背部出 IB cable 到 ToR/spine 交换机。
 */
interface ConnectX7Props {
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** 是否高亮（有流量时） */
  active?: boolean
}

export function ConnectX7({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  active = false,
}: ConnectX7Props) {
  return (
    <group position={position} rotation={rotation}>
      <mesh material={M.pcbBlack} position={[0, 0.005, 0]}>
        <boxGeometry args={[0.05, 0.01, 0.075]} />
      </mesh>
      <mesh material={M.silicon} position={[0, 0.013, 0]}>
        <boxGeometry args={[0.02, 0.005, 0.02]} />
      </mesh>
      {/* 散热片 */}
      <mesh material={M.heatsinkAlu} position={[0, 0.018, 0]}>
        <boxGeometry args={[0.025, 0.006, 0.025]} />
      </mesh>
      {/* IB QSFP cage */}
      <mesh
        material={active ? M.ibEmissive : M.chassisDark}
        position={[0, 0.011, -0.04]}
      >
        <boxGeometry args={[0.025, 0.013, 0.02]} />
      </mesh>
      <mesh material={M.ledBlue} position={[0, 0.018, -0.05]}>
        <boxGeometry args={[0.004, 0.002, 0.001]} />
      </mesh>
    </group>
  )
}
