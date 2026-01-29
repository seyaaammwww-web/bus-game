import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, Stars, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

function RotatingMonolith() {
    const meshRef = useRef()

    useFrame((state) => {
        // 1. Slow continuous rotation
        meshRef.current.rotation.y += 0.005

        // 2. Reactive tilt based on mouse position
        const { x, y } = state.mouse
        // Smoothly interpolate current rotation offset towards mouse position
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, y * 0.2, 0.1)
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -x * 0.2, 0.1)
    })

    return (
        <mesh ref={meshRef} position={[0, -1, 0]}>
            <boxGeometry args={[3, 5, 1]} />
            <meshStandardMaterial
                color="#111"
                roughness={0.1}
                metalness={0.8}
                envMapIntensity={1}
            />
        </mesh>
    )
}

function SpaceHeader() {
    return (
        <group>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            {/* Floating Title (Simulated 3D Text) */}
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <Text
                    position={[0, 2, -2]}
                    fontSize={1.5}
                    color="#e9d5ff"
                    font="/fonts/DogicaPixel/700.woff2" /* Trying to use local font if compatible, usually needs ttf/otf or woff, library handles it */
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.05}
                    outlineColor="#4c1d95"
                >
                    LAUNCH WEEK
                </Text>
            </Float>

            <RotatingMonolith />
        </group>
    )
}

export default function HeroScene() {
    return (
        <div className="h-screen w-full relative">
            <Canvas gl={{ antialias: false }} pixelRatio={1}>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                <SpaceHeader />
            </Canvas>

            {/* HTML Overlay for interactions that need to be in DOM */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
                <div className="pointer-events-auto flex justify-between">
                    {/* Header DOM UI */}
                    <div className="bg-white px-2 py-1 rounded shadow-md border border-gray-900 flex items-center gap-2">
                        <span className="font-bold text-xs text-black">WorkOS</span>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/20 px-2 py-1 rounded backdrop-blur-sm text-white text-xs">On</div>
                    </div>
                </div>

                <div className="pointer-events-auto text-center">
                    {/* Bottom DOM UI */}
                    <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
                        EXPLORE
                    </button>
                </div>
            </div>
        </div>
    )
}
