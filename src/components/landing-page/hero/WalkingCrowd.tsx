"use client";

import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";
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
  depth: number;
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

const CROWD_COUNT = 56;

const CROWD: CrowdCharacter[] = Array.from(
  { length: CROWD_COUNT },
  (_, index) => {
    const depthPosition = 31 + ((index * 23 + 11) % 55);
    const depth = (depthPosition - 31) / (85 - 31);
    const top = 58 + depth * 10;
    const width = Math.round(146 + (depthPosition - 31.8) * 2.62);
    const baseDuration = (26 + ((index * 7) % 15) + depth * 7) * 0.92;
    const speedMultiplier = 1 + (index % 4) * 0.04;
    const duration = baseDuration / speedMultiplier;

    return {
      direction: index % 2 === 0 ? 1 : -1,
      duration,
      depth,
      height: Math.round(width * 1.35),
      image: CHARACTER_ASSETS[index % CHARACTER_ASSETS.length],
      index,
      phase: ((index * 19 + 13) % CROWD_COUNT) / CROWD_COUNT,
      top,
      width,
    };
  },
);

export default function WalkingCrowd() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[3] overflow-hidden"
    >
      {CROWD.map((character) => {
        const from =
          character.direction === 1 ? "calc(-100% - 6vw)" : "106vw";
        const to =
          character.direction === 1 ? "106vw" : "calc(-100% - 6vw)";
        const fromPosition = character.direction === 1 ? -6 : 104;
        const toPosition = character.direction === 1 ? 104 : -6;
        const characterStyle: CSSCustomProperties = {
          height: character.height,
          opacity: 1,
          top: `${character.top}%`,
          width: character.width,
          zIndex: Math.floor(31 + character.depth * (85 - 31)),
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
            className="floo-crowd-character"
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
    </div>
  );
}
