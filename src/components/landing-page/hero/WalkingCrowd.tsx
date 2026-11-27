"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import image1 from "./assets/image-1.svg";
import image2 from "./assets/image-2.svg";
import image3 from "./assets/image-3.svg";
import image4 from "./assets/image-4.svg";
import image5 from "./assets/image-5.svg";
import image6 from "./assets/image-6.svg";
import image7 from "./assets/image-7.svg";
import image8 from "./assets/image-8.svg";
import image9 from "./assets/image-9.svg";
import image10 from "./assets/image-10.svg";
import image11 from "./assets/image-11.svg";
import image12 from "./assets/image-12.svg";
import image13 from "./assets/image-13.svg";
import image14 from "./assets/image-14.svg";
import image15 from "./assets/image-15.svg";

const CHARACTER_ASSETS: StaticImageData[] = [
  image1,
  image2,
  image3,
  image4,
  image5,
  image6,
  image7,
  image8,
  image9,
  image10,
  image11,
  image12,
  image13,
  image14,
  image15,
];

type CrowdCharacter = {
  direction: 1 | -1;
  duration: number;
  height: number;
  image: StaticImageData;
  index: number;
  phase: number;
  top: number;
  width: number;
};

type CSSCustomProperties = CSSProperties & {
  [key: `--${string}`]: number | string;
};

const CROWD: CrowdCharacter[] = Array.from({ length: 64 }, (_, index) => {
  const top = 31 + ((index * 29 + 11) % 55);
  const width = Math.round(146 + (top - 31.8) * 2.62);
  const depth = (top - 31) / (85 - 31);

  return {
    direction: index % 2 === 0 ? 1 : -1,
    duration: 26 + ((index * 7) % 15) + depth * 7,
    height: Math.round(width * 1.35),
    image: CHARACTER_ASSETS[index % CHARACTER_ASSETS.length],
    index,
    phase: ((index * 17) % 64) / 64,
    top,
    width,
  };
});

export default function WalkingCrowd() {
  const crowdRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const crowd = crowdRef.current;
    if (!crowd) {
      return;
    }

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let animationFrame: number | null = null;
    let normalizedPointerX = 0;
    let pointerTracking = false;

    const updateParallax = (event: PointerEvent) => {
      normalizedPointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      if (animationFrame !== null) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        const characters =
          crowd.querySelectorAll<HTMLElement>("[data-parallax-depth]");

        characters.forEach((character) => {
          const depth = Number(character.dataset.parallaxDepth ?? "0");
          character.style.setProperty(
            "--parallax-x",
            `${-normalizedPointerX * depth * 3}vw`,
          );
        });
      });
    };

    const syncMotionPreference = () => {
      if (motionPreference.matches) {
        if (pointerTracking) {
          window.removeEventListener("pointermove", updateParallax);
          pointerTracking = false;
        }
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        crowd
          .querySelectorAll<HTMLElement>("[data-parallax-depth]")
          .forEach((character) =>
            character.style.setProperty("--parallax-x", "0vw"),
          );
      } else if (!pointerTracking) {
        window.addEventListener("pointermove", updateParallax, {
          passive: true,
        });
        pointerTracking = true;
      }
    };

    motionPreference.addEventListener("change", syncMotionPreference);
    syncMotionPreference();

    return () => {
      motionPreference.removeEventListener("change", syncMotionPreference);
      if (pointerTracking) {
        window.removeEventListener("pointermove", updateParallax);
      }
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[3] overflow-hidden"
      ref={crowdRef}
    >
      {CROWD.map((character) => {
        const depth = (character.top - 31) / (85 - 31);
        const from = character.direction === 1 ? "-6vw" : "104vw";
        const to = character.direction === 1 ? "104vw" : "-6vw";
        const fromPosition = character.direction === 1 ? -6 : 104;
        const toPosition = character.direction === 1 ? 104 : -6;
        const characterStyle: CSSCustomProperties = {
          filter: `blur(${Math.max(0.04, (78 - character.top) * 0.05)}px)`,
          height: character.height,
          opacity: 0.48 + depth * 0.48,
          top: `${character.top}%`,
          width: character.width,
          zIndex: Math.floor(character.top),
        };
        const walkerStyle: CSSCustomProperties = {
          "--reduced-walk-x": `${
            fromPosition + (toPosition - fromPosition) * character.phase
          }vw`,
          "--walk-duration": `${character.duration}s`,
          "--walk-from": from,
          "--walk-to": to,
          animationDelay: `${-character.duration * character.phase}s`,
        };

        return (
          <div
            className="floo-crowd-parallax"
            data-parallax-depth={depth}
            key={character.index}
            style={characterStyle}
          >
            <div className="floo-crowd-walker" style={walkerStyle}>
              <div
                className="h-full w-full"
                style={{ transform: `scaleX(${character.direction})` }}
              >
                <Image
                  alt=""
                  className="floo-crowd-art"
                  height={324}
                  src={character.image}
                  unoptimized
                  width={240}
                />
              </div>
            </div>
          </div>
        );
      })}
      <div className="floo-crowd-fade absolute inset-0" />
    </div>
  );
}
