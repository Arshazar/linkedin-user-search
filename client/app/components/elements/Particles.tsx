import { useMemo } from "react";
import { loadSlim } from "@tsparticles/slim";
import { MoveDirection, OutMode } from "@tsparticles/engine";
import type { Engine, ISourceOptions } from "@tsparticles/engine";
import { Particles as ParticlesComponent, ParticlesProvider } from "@tsparticles/react";

const particlesInit = async (engine: Engine): Promise<void> => {
  await loadSlim(engine);
};

export const Particles = () => {
  const options: ISourceOptions = useMemo(
    () => ({
      background: {
        color: {
          value: "#00132fff",
        },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: "push",
          },
          onHover: {
            enable: true,
            mode: "repulse",
          },
        },
        modes: {
          push: {
            quantity: 4,
          },
          repulse: {
            distance: 200,
            duration: 0.6,
          },
        },
      },
      particles: {
        color: {
          value: "#ffffff",
        },
        links: {
          color: "#ffffff",
          distance: 150,
          enable: true,
          opacity: 0.5,
          width: 1,
        },
        move: {
          direction: MoveDirection.none,
          enable: true,
          outModes: {
            default: OutMode.out,
          },
          random: false,
          speed: 2,
          straight: false,
        },
        number: {
          density: {
            enable: true,
          },
          value: 80,
        },
        opacity: {
          value: 0.5,
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 1, max: 5 },
        },
      },
      detectRetina: true,
    }),
    [],
  );

  return (
    <ParticlesProvider init={particlesInit}>
      <ParticlesComponent id="tsparticles" options={options} />
    </ParticlesProvider>
  );
};