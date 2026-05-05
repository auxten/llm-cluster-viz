import { Environment } from '@react-three/drei'

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#9eb7d8', '#161a22', 0.5]} />
      <directionalLight
        position={[5, 8, 6]}
        intensity={1.1}
        color="#f4f1e8"
      />
      <directionalLight
        position={[-6, 5, 4]}
        intensity={0.55}
        color="#9bb6ff"
      />
      <directionalLight
        position={[0, 3, 9]}
        intensity={0.6}
        color="#ffffff"
      />
      <Environment preset="warehouse" environmentIntensity={0.25} />
    </>
  )
}
