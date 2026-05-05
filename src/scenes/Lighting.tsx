import { Environment } from '@react-three/drei'

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#bccfee', '#27314a', 0.75]} />
      <directionalLight
        position={[5, 8, 6]}
        intensity={1.5}
        color="#fff5e0"
      />
      <directionalLight
        position={[-6, 5, 4]}
        intensity={0.8}
        color="#b6cdff"
      />
      <directionalLight
        position={[0, 3, 9]}
        intensity={0.85}
        color="#ffffff"
      />
      <Environment preset="warehouse" environmentIntensity={0.55} />
    </>
  )
}
