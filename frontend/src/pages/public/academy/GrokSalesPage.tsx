import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { usePageMeta } from '../../../hooks/usePageMeta';

const CHECKOUT_ROUTE = '/academy/checkout/dominando-inteligencia-artificial-para-videos';

/* ── Container com isolamento dos estilos da Landing Page ── */
const LpRoot = styled.div`
  --bg: #0A0A0A;
  --bg2: #111211;
  --txt: #FFFFFF;
  --soft: #CFCFCF;
  --mut: #8C8C8C;
  --lime: #B6E829;
  --lime2: #D4F56B;
  --limeDim: rgba(182, 232, 41, 0.12);
  --glass: rgba(255, 255, 255, 0.045);
  --line: rgba(255, 255, 255, 0.12);
  --r: 28px;
  --sh: 0 24px 60px rgba(0, 0, 0, 0.45);
  --fT: "Hero", "Poppins", system-ui, sans-serif;
  --fB: "Poppins", system-ui, sans-serif;

  background: var(--bg);
  color: var(--txt);
  font-family: var(--fB);
  font-size: 16px;
  line-height: 1.55;
  overflow-x: hidden;
  position: relative;

  img, video {
    display: block;
    max-width: 100%;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .wrap {
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    padding-left: max(20px, env(safe-area-inset-left, 0px));
    padding-right: max(20px, env(safe-area-inset-right, 0px));
  }

  section {
    position: relative;
    padding: 72px 0;
  }

  h1, h2, h3 {
    font-family: var(--fT);
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -0.01em;
  }

  h2 {
    font-size: clamp(30px, 6.4vw, 50px);
    margin-bottom: 16px;
  }

  h3 {
    font-size: 22px;
  }

  .lime {
    color: var(--lime);
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font: 600 12px/1 var(--fB);
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--lime);
    border: 1px solid rgba(182, 232, 41, 0.45);
    border-radius: 99px;
    padding: 9px 16px;
    margin-bottom: 20px;
    background: rgba(182, 232, 41, 0.06);
  }

  .lead {
    color: var(--soft);
    font-size: clamp(17px, 2.4vw, 20px);
    max-width: 640px;
  }

  .center {
    text-align: center;
  }
  .center .lead {
    margin-left: auto;
    margin-right: auto;
  }

  .grid-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%);
  }

  .glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
    opacity: 0.55;
  }

  /* ── Botão CTA ── */
  .btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    max-width: 460px;
    min-height: 64px;
    padding: 16px 26px;
    border: 0;
    border-radius: 18px;
    background: var(--lime);
    color: #0A0A0A;
    font: 800 17px/1.15 var(--fB);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    cursor: pointer;
    box-shadow: 0 14px 40px rgba(182, 232, 41, 0.35), inset 0 -3px 0 rgba(0, 0, 0, 0.18);
    transition: transform 0.15s, box-shadow 0.15s;
    overflow: hidden;
    animation: lpPulse 2.6s infinite;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 50px rgba(182, 232, 41, 0.5);
  }

  .btn:active {
    transform: translateY(1px);
  }

  .btn::after {
    content: "";
    position: absolute;
    top: 0;
    left: -60%;
    width: 40%;
    height: 100%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.55), transparent);
    transform: skewX(-20deg);
    animation: lpShine 3.4s infinite;
  }

  .btn svg {
    flex: none;
  }

  @keyframes lpShine {
    0%, 60% { left: -60%; }
    100% { left: 130%; }
  }

  @keyframes lpPulse {
    0%, 100% {
      box-shadow: 0 14px 40px rgba(182, 232, 41, 0.35), 0 0 0 0 rgba(182, 232, 41, 0.45);
    }
    50% {
      box-shadow: 0 14px 40px rgba(182, 232, 41, 0.35), 0 0 0 12px rgba(182, 232, 41, 0);
    }
  }

  .trust {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: 14px;
    color: var(--mut);
    font-size: 13px;
  }

  .trust span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .trust svg {
    color: var(--lime);
  }

  /* ── Hero ── */
  .hero {
    padding: 72px 0 56px;
    overflow: hidden;
  }
  .hero .wrap {
    display: grid;
    gap: 40px;
    align-items: center;
  }
  .hero h1 {
    font-size: clamp(40px, 10.5vw, 64px);
    margin-bottom: 18px;
  }
  .hero .lead {
    margin-bottom: 26px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 28px;
  }
  .chip {
    border: 1px solid var(--line);
    background: var(--glass);
    border-radius: 99px;
    padding: 8px 14px;
    font-size: 14px;
    font-weight: 500;
  }
  .chip b {
    color: var(--lime);
  }
  .price-mini {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .price-mini small {
    color: var(--soft);
    font-size: 16px;
  }
  .price-mini strong {
    font-family: var(--fT);
    font-size: 44px;
    line-height: 1;
    color: var(--lime);
  }
  .price-mini em {
    font-style: normal;
    color: var(--mut);
    font-size: 14px;
  }

  .phones {
    position: relative;
    height: 540px;
    display: flex;
    justify-content: center;
  }
  .phone {
    position: absolute;
    width: 260px;
    aspect-ratio: 9/16;
    border-radius: 34px;
    padding: 8px;
    background: linear-gradient(160deg, #2a2a2a, #0e0e0e);
    box-shadow: var(--sh), 0 0 0 1px rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  .phone video, .phone img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 27px;
    background: #111;
  }
  .phone .lbl {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 22px;
    white-space: nowrap;
    font: 700 11px/1 var(--fB);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 9px 14px;
    border-radius: 99px;
  }
  .phone.a {
    transform: rotate(-6deg) translateX(-70px);
    z-index: 2;
    top: 20px;
  }
  .phone.b {
    transform: rotate(7deg) translateX(90px);
    top: 0;
    opacity: 0.92;
  }
  .phone.a .lbl {
    background: var(--lime);
    color: #0A0A0A;
  }
  .phone.b .lbl {
    background: rgba(10, 10, 10, 0.85);
    color: #fff;
    border: 1px solid var(--line);
    bottom: auto;
    top: 22px;
  }
  .float-badge {
    position: absolute;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(14, 14, 14, 0.82);
    backdrop-filter: blur(10px);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 10px 14px;
    font-size: 13px;
    box-shadow: var(--sh);
  }
  .float-badge img {
    height: 18px;
    width: auto;
  }
  .fb1 {
    left: 0;
    bottom: 40px;
  }
  .fb2 {
    right: 0;
    top: 120px;
  }
  .fb2 b {
    color: var(--lime);
    font-size: 20px;
    font-family: var(--fT);
  }

  @media (max-width: 420px) {
    .fb2 {
      top: auto;
      bottom: 110px;
      right: 4px;
    }
    .fb1 {
      bottom: 24px;
    }
  }

  /* ── Faixa de Prova (Reel) ── */
  .reel {
    padding: 28px 0 40px;
    overflow: hidden;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    background: var(--bg2);
  }
  .reel p {
    text-align: center;
    color: var(--soft);
    font-size: 14px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .reel p b {
    color: var(--lime);
  }
  .track {
    display: flex;
    gap: 14px;
    width: max-content;
    animation: lpRoll 60s linear infinite;
  }
  .track img {
    width: 150px;
    aspect-ratio: 9/16;
    object-fit: cover;
    border-radius: 18px;
    border: 1px solid var(--line);
  }
  @keyframes lpRoll {
    to {
      transform: translateX(-50%);
    }
  }

  /* ── Cards / Dores ── */
  .cards {
    display: grid;
    gap: 14px;
    margin-top: 36px;
  }
  .card {
    background: var(--glass);
    border: 1px solid var(--line);
    border-radius: var(--r);
    padding: 24px;
  }
  .card h3 {
    margin-bottom: 8px;
  }
  .card p {
    color: var(--soft);
    font-size: 15px;
  }
  .ico {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: var(--limeDim);
    color: var(--lime);
    display: grid;
    place-items: center;
    margin-bottom: 16px;
  }

  /* ── Dois Estilos ── */
  .styles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 36px;
  }
  .style {
    position: relative;
    border-radius: 24px;
    overflow: hidden;
    aspect-ratio: 9/16;
    border: 1px solid var(--line);
    background: #111;
  }
  .style video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .style .lbl {
    position: absolute;
    top: 12px;
    left: 12px;
    font: 700 10px/1 var(--fB);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 8px 11px;
    border-radius: 99px;
    background: rgba(10, 10, 10, 0.8);
    border: 1px solid var(--line);
  }
  .style.d .lbl {
    background: var(--lime);
    color: #0A0A0A;
    border: 0;
  }
  .switcher {
    display: inline-flex;
    gap: 6px;
    padding: 6px;
    border-radius: 99px;
    background: var(--glass);
    border: 1px solid var(--line);
    margin-top: 28px;
  }
  .switcher button {
    border: 0;
    background: transparent;
    color: var(--soft);
    font: 600 14px var(--fB);
    padding: 10px 16px;
    border-radius: 99px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .switcher button.on {
    background: #fff;
    color: #0A0A0A;
  }
  .same {
    margin-top: 16px;
    color: var(--mut);
    font-size: 14px;
  }

  /* ── Comparação ── */
  .versus {
    display: grid;
    gap: 14px;
    margin-top: 36px;
  }
  .vs {
    border-radius: var(--r);
    padding: 26px;
    border: 1px solid var(--line);
  }
  .vs.bad {
    background: rgba(255, 255, 255, 0.025);
  }
  .vs.good {
    background: linear-gradient(160deg, rgba(182, 232, 41, 0.14), rgba(182, 232, 41, 0.03));
    border-color: rgba(182, 232, 41, 0.5);
    box-shadow: 0 0 60px rgba(182, 232, 41, 0.08);
  }
  .vs h3 {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .vs ul {
    list-style: none;
    display: grid;
    gap: 12px;
  }
  .vs li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 15px;
    color: var(--soft);
  }
  .vs li svg {
    flex: none;
    margin-top: 3px;
  }
  .vs.bad li svg {
    color: #ff6b6b;
  }
  .vs.good li svg {
    color: var(--lime);
  }
  .vs.good li {
    color: #fff;
  }

  /* ── 4 Passos ── */
  .steps {
    display: grid;
    gap: 14px;
    margin-top: 36px;
  }
  .step {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 18px;
    align-items: center;
    background: var(--glass);
    border: 1px solid var(--line);
    border-radius: var(--r);
    padding: 14px;
  }
  .step img {
    width: 110px;
    aspect-ratio: 3/4;
    object-fit: cover;
    border-radius: 18px;
  }
  .step .n {
    font: 700 13px var(--fB);
    color: var(--lime);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .step h3 {
    font-size: 20px;
    margin-bottom: 4px;
  }
  .step p {
    color: var(--soft);
    font-size: 14px;
  }

  /* ── Módulos ── */
  .mods {
    display: grid;
    gap: 12px;
    margin-top: 36px;
  }
  details.mod {
    background: var(--glass);
    border: 1px solid var(--line);
    border-radius: 22px;
    overflow: hidden;
  }
  details.mod[open] {
    border-color: rgba(182, 232, 41, 0.45);
  }
  details.mod summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 22px;
  }
  details.mod summary::-webkit-details-marker {
    display: none;
  }
  .mod .num {
    flex: none;
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: var(--lime);
    color: #0A0A0A;
    display: grid;
    place-items: center;
    font: 700 20px var(--fT);
  }
  .mod .tt {
    flex: 1;
  }
  .mod .tt small {
    display: block;
    color: var(--mut);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .mod .tt b {
    font-family: var(--fT);
    font-size: 20px;
    font-weight: 700;
  }
  .mod .chev {
    transition: transform 0.2s;
    color: var(--soft);
  }
  details.mod[open] .chev {
    transform: rotate(180deg);
  }
  .mod ol {
    list-style: none;
    padding: 0 22px 20px 84px;
    display: grid;
    gap: 10px;
  }
  .mod li {
    color: var(--soft);
    font-size: 15px;
    display: flex;
    gap: 10px;
  }
  .mod li span {
    color: var(--lime);
    font-weight: 600;
    min-width: 28px;
  }
  .mod .pdf {
    margin: 0 22px 20px 84px;
    display: inline-flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
    color: var(--lime);
    background: var(--limeDim);
    border-radius: 99px;
    padding: 7px 12px;
  }

  /* ── Galeria ── */
  .gallery {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 36px;
  }
  .gi {
    position: relative;
    border-radius: 22px;
    overflow: hidden;
    aspect-ratio: 9/16;
    background: #111;
    border: 1px solid var(--line);
  }
  .gi video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .gi .cap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 40px 14px 14px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
    font-weight: 600;
    font-size: 14px;
    line-height: 1.3;
  }
  .gi .cap small {
    display: block;
    color: var(--lime);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  /* ── Para quem é ── */
  .fit {
    display: grid;
    gap: 14px;
    margin-top: 36px;
  }
  .fit .card ul {
    list-style: none;
    display: grid;
    gap: 12px;
    margin-top: 12px;
  }
  .fit .card li {
    display: flex;
    gap: 10px;
    color: var(--soft);
    font-size: 15px;
  }
  .fit .card li svg {
    flex: none;
    margin-top: 3px;
  }
  .fit .yes {
    border-color: rgba(182, 232, 41, 0.45);
  }
  .fit .yes svg {
    color: var(--lime);
  }
  .fit .no svg {
    color: #ff6b6b;
  }

  /* ── Autoridade / Prova ── */
  .proof {
    display: grid;
    gap: 28px;
    align-items: center;
  }
  .proof .pic {
    position: relative;
    max-width: 360px;
    margin: 0 auto;
    width: 100%;
  }
  .proof .pic img {
    border-radius: var(--r);
    aspect-ratio: 4/5;
    object-fit: cover;
    box-shadow: var(--sh);
    border: 1px solid var(--line);
  }
  .proof .pic .seal {
    position: absolute;
    right: -8px;
    bottom: -14px;
    background: var(--lime);
    color: #0A0A0A;
    border-radius: 16px;
    padding: 10px 14px;
    font: 700 13px/1.2 var(--fB);
    box-shadow: var(--sh);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 24px;
  }
  .stat {
    background: var(--glass);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 14px;
    text-align: center;
  }
  .stat b {
    display: block;
    font: 700 28px/1 var(--fT);
    color: var(--lime);
    margin-bottom: 6px;
  }
  .stat span {
    font-size: 12px;
    color: var(--soft);
    line-height: 1.3;
    display: block;
  }

  /* ── Oferta ── */
  .offer {
    padding-top: 88px;
  }
  .offer-box {
    position: relative;
    max-width: 620px;
    margin: 36px auto 0;
    border-radius: 32px;
    padding: 30px 22px;
    background: linear-gradient(180deg, #151615, #0d0d0d);
    border: 1px solid rgba(182, 232, 41, 0.55);
    box-shadow:
      0 0 0 6px rgba(182, 232, 41, 0.06),
      0 40px 90px rgba(0, 0, 0, 0.6),
      0 0 120px rgba(182, 232, 41, 0.12);
  }
  .offer-box .ribbon {
    position: absolute;
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--lime);
    color: #0A0A0A;
    font: 800 12px/1 var(--fB);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 9px 16px;
    border-radius: 99px;
    white-space: nowrap;
  }
  .offer-cover {
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid var(--line);
    margin-bottom: 22px;
  }
  .stack {
    list-style: none;
    display: grid;
    gap: 12px;
    margin-bottom: 24px;
  }
  .stack li {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    font-size: 15px;
    padding-bottom: 12px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
  }
  .stack li:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
  .stack li svg {
    flex: none;
    color: var(--lime);
    margin-top: 2px;
  }
  .stack li b {
    display: block;
  }
  .stack li small {
    color: var(--mut);
    font-size: 13px;
  }
  .stack .bonus {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.14em;
    background: var(--lime);
    color: #0A0A0A;
    padding: 3px 7px;
    border-radius: 6px;
    margin-right: 6px;
    vertical-align: 2px;
  }
  .price {
    text-align: center;
    margin: 8px 0 22px;
  }
  .price .de {
    color: var(--mut);
    font-size: 15px;
    margin-bottom: 6px;
  }
  .price .x {
    font-size: 20px;
    color: var(--soft);
    font-weight: 500;
  }
  .price .big {
    display: block;
    font: 700 clamp(64px, 17vw, 92px)/1 var(--fT);
    color: var(--lime);
    letter-spacing: -0.02em;
    margin: 4px 0 8px;
    text-shadow: 0 0 40px rgba(182, 232, 41, 0.35);
  }
  .price .vista {
    color: var(--soft);
    font-size: 15px;
  }
  .price .day {
    display: inline-block;
    margin-top: 12px;
    font-size: 13px;
    color: var(--lime);
    background: var(--limeDim);
    border-radius: 99px;
    padding: 7px 12px;
  }
  .offer-box .btn {
    max-width: none;
  }
  .pay {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  .pay span {
    font-size: 12px;
    color: var(--soft);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 6px 10px;
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }

  /* ── Garantia ── */
  .guarantee {
    display: grid;
    gap: 24px;
    align-items: center;
    max-width: 860px;
    margin: 0 auto;
    background: var(--glass);
    border: 1px solid var(--line);
    border-radius: 32px;
    padding: 30px 24px;
  }
  .g-seal {
    width: 150px;
    height: 150px;
    margin: 0 auto;
    position: relative;
  }
  .g-seal svg {
    width: 100%;
    height: 100%;
  }
  .guarantee h2 {
    font-size: clamp(28px, 5.6vw, 40px);
  }
  .guarantee p {
    color: var(--soft);
  }

  /* ── 2 Caminhos ── */
  .paths {
    display: grid;
    gap: 14px;
    margin-top: 36px;
  }
  .path {
    border-radius: var(--r);
    padding: 26px;
    border: 1px solid var(--line);
    background: var(--glass);
  }
  .path.good {
    border-color: rgba(182, 232, 41, 0.5);
    background: linear-gradient(160deg, rgba(182, 232, 41, 0.12), transparent);
  }
  .path small {
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mut);
  }
  .path.good small {
    color: var(--lime);
  }
  .path h3 {
    margin: 8px 0;
  }
  .path p {
    color: var(--soft);
    font-size: 15px;
  }

  /* ── FAQ ── */
  .faq {
    max-width: 780px;
    margin: 36px auto 0;
    display: grid;
    gap: 10px;
  }
  .faq details {
    background: var(--glass);
    border: 1px solid var(--line);
    border-radius: 18px;
  }
  .faq summary {
    list-style: none;
    cursor: pointer;
    padding: 18px 20px;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }
  .faq summary::-webkit-details-marker {
    display: none;
  }
  .faq summary::after {
    content: "+";
    font: 400 26px/1 var(--fB);
    color: var(--lime);
    transition: transform 0.2s;
  }
  .faq details[open] summary::after {
    transform: rotate(45deg);
  }
  .faq details p {
    padding: 0 20px 18px;
    color: var(--soft);
    font-size: 15px;
  }

  /* ── CTA Final ── */
  .final {
    text-align: center;
    overflow: hidden;
    padding: 96px 0 120px;
  }
  .final h2 {
    font-size: clamp(34px, 8vw, 60px);
  }
  .final .btn {
    margin: 30px auto 0;
  }
  .final .trust {
    justify-content: center;
  }

  /* ── CTA Fixo (mobile/desktop) ── */
  .sticky {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    padding: 10px max(14px, env(safe-area-inset-right, 0px))
      calc(10px + env(safe-area-inset-bottom, 0px)) max(14px, env(safe-area-inset-left, 0px));
    background: rgba(10, 10, 10, 0.92);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--line);
    display: flex;
    align-items: center;
    gap: 12px;
    transform: translateY(110%);
    transition: transform 0.3s;
  }
  .sticky.show {
    transform: none;
  }
  .sticky .p {
    flex: none;
    line-height: 1.1;
  }
  .sticky .p small {
    display: block;
    font-size: 11px;
    color: var(--soft);
  }
  .sticky .p b {
    font: 700 24px var(--fT);
    color: var(--lime);
  }
  .sticky .btn {
    min-height: 52px;
    font-size: 15px;
    padding: 12px 16px;
    border-radius: 14px;
    animation: none;
  }

  /* ── Modal de Saída ── */
  .modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal.on {
    display: flex;
  }
  .modal .box {
    position: relative;
    max-width: 460px;
    background: #121312;
    border: 1px solid rgba(182, 232, 41, 0.5);
    border-radius: 28px;
    padding: 32px 26px;
    text-align: center;
  }
  .modal h3 {
    font-size: 28px;
    margin: 10px 0;
  }
  .modal p {
    color: var(--soft);
    margin-bottom: 20px;
  }
  .modal .x {
    position: absolute;
    top: 12px;
    right: 14px;
    background: none;
    border: 0;
    color: var(--soft);
    font-size: 28px;
    cursor: pointer;
  }
  .modal .btn {
    margin: 0 auto;
  }

  /* ── Responsivo Desktop ── */
  @media (min-width: 760px) {
    section {
      padding: 104px 0;
    }
    .hero {
      padding: 100px 0 80px;
    }
    .hero .wrap {
      grid-template-columns: 1.1fr 0.9fr;
    }
    .phones {
      height: 600px;
    }
    .phone {
      width: 290px;
    }
    .cards {
      grid-template-columns: repeat(2, 1fr);
    }
    .styles {
      max-width: 620px;
      margin-left: auto;
      margin-right: auto;
    }
    .versus {
      grid-template-columns: 1fr 1fr;
    }
    .steps {
      grid-template-columns: 1fr 1fr;
    }
    .gallery {
      grid-template-columns: repeat(4, 1fr);
    }
    .fit {
      grid-template-columns: 1fr 1fr;
    }
    .proof {
      grid-template-columns: 0.8fr 1.2fr;
    }
    .guarantee {
      grid-template-columns: 180px 1fr;
      padding: 40px;
    }
    .g-seal {
      width: 180px;
      height: 180px;
    }
    .paths {
      grid-template-columns: 1fr 1fr;
    }
    .offer-box {
      padding: 40px 36px;
    }
    .sticky {
      justify-content: center;
    }
    .sticky .btn {
      max-width: 360px;
    }
  }

  @media (min-width: 1000px) {
    .cards.c4 {
      grid-template-columns: repeat(4, 1fr);
    }
  }
`;

const REEL_IMAGES = [
  'arca', 'jardim', 'avo', 'voando', 'daniel', 'bolo-real', 'familia',
  'sorrindo', 'davi', 'real', 'neto', 'abraco', 'cinema', 'jardim-real'
];

export function GrokSalesPage() {
  usePageMeta(
    'Filmes com IA usando só o Grok — PicPlus Academy',
    'Aprenda a transformar qualquer história em um filme — em desenho animado ou cinema realista — usando uma única ferramenta de IA, direto do celular. 10x de R$ 9,70.',
  );

  // Par ativo para o comparador (0 = Família no jardim, 1 = A gaveta de histórias)
  const [stylePair, setStylePair] = useState<0 | 1>(0);

  // Sticky CTA e Modal de saída
  const [showSticky, setShowSticky] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const offerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current || !offerRef.current) return;
      const heroBottom = heroRef.current.getBoundingClientRect().bottom;
      const offerRect = offerRef.current.getBoundingClientRect();
      const inOffer = offerRect.top < window.innerHeight && offerRect.bottom > 0;
      setShowSticky(heroBottom < 0 && !inOffer);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Modal de saída (apenas 1x no desktop)
  useEffect(() => {
    let triggered = false;
    try {
      triggered = sessionStorage.getItem('lpExitTriggered') === '1';
    } catch {
      /* noop */
    }

    const handleMouseOut = (e: MouseEvent) => {
      if (triggered || window.innerWidth < 760 || e.relatedTarget || e.clientY > 10) return;
      triggered = true;
      try {
        sessionStorage.setItem('lpExitTriggered', '1');
      } catch {
        /* noop */
      }
      setShowExitModal(true);
    };

    document.addEventListener('mouseout', handleMouseOut);
    return () => document.removeEventListener('mouseout', handleMouseOut);
  }, []);

  // IntersectionObserver para reprodução automática e inteligente de vídeos
  useEffect(() => {
    const vids = document.querySelectorAll<HTMLVideoElement>('video');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const v = entry.target as HTMLVideoElement;
            if (entry.isIntersecting) {
              const p = v.play();
              if (p && p.catch) p.catch(() => {});
            } else {
              v.pause();
            }
          });
        },
        { rootMargin: '120px 0px', threshold: 0.15 },
      );
      vids.forEach((v) => io.observe(v));
      return () => io.disconnect();
    }
  }, [stylePair]);

  return (
    <LpRoot>
      {/* ── HERO ── */}
      <section className="hero" ref={heroRef}>
        <div className="grid-bg"></div>
        <div
          className="glow"
          style={{
            width: 520,
            height: 520,
            background: '#B6E829',
            opacity: 0.13,
            top: -180,
            left: -160,
          }}
        ></div>
        <div className="wrap">
          <div>
            <h1>
              Transforme qualquer história em um <span className="lime">filme</span>. Usando só o Grok.
            </h1>
            <p className="lead">
              Do roteiro ao filme pronto, direto do celular — em <b>desenho animado</b> ou{' '}
              <b>cinema realista</b>. Mesmo que você nunca tenha editado um vídeo na vida.
            </p>
            <div className="chips">
              <span className="chip">
                <b>12</b> aulas curtas
              </span>
              <span className="chip">
                <b>1</b> única ferramenta
              </span>
              <span className="chip">Prompts prontos</span>
              <span className="chip">Celular ou computador</span>
            </div>
            <div className="price-mini">
              <small>10x de</small>
              <strong>R$ 9,70</strong>
              <em>ou R$ 97,90 à vista</em>
            </div>
            <Link className="btn cta" to={CHECKOUT_ROUTE}>
              Quero criar meu primeiro filme
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <div className="trust">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Acesso imediato
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                7 dias de garantia
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Pagamento seguro
              </span>
            </div>
          </div>

          <div className="phones">
            <div className="phone b">
              <video
                src="/courses/grok/video/jardim-real.mp4"
                poster="/courses/grok/img/jardim-real.jpg"
                muted
                loop
                playsInline
                autoPlay
              />
              <span className="lbl">Cinema realista</span>
            </div>
            <div className="phone a">
              <video
                src="/courses/grok/video/voando.mp4"
                poster="/courses/grok/img/voando.jpg"
                muted
                loop
                playsInline
                autoPlay
              />
              <span className="lbl">Desenho animado</span>
            </div>
            <div className="float-badge fb1">
              <span style={{ color: 'var(--soft)' }}>100% feito no</span>
              <img src="/courses/grok/img/grok-wordmark.svg" alt="Grok" />
            </div>
            <div className="float-badge fb2">
              <b>0</b>
              <span>
                programas de<br />edição
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAIXA DE PROVA (REEL) ── */}
      <div className="reel">
        <p>
          Todas as cenas desta página foram feitas <b>só com o Grok</b>
        </p>
        <div className="track">
          {[...REEL_IMAGES, ...REEL_IMAGES].map((imgName, idx) => (
            <img
              key={`${imgName}-${idx}`}
              src={`/courses/grok/img/${imgName}.jpg`}
              alt=""
              loading="lazy"
              width="150"
              height="267"
            />
          ))}
        </div>
      </div>

      {/* ── IDENTIFICAÇÃO ── */}
      <section>
        <div className="wrap center">
          <span className="eyebrow">Pare um segundo</span>
          <h2>
            Quantas histórias você já guardou na <span className="lime">gaveta</span>?
          </h2>
          <p className="lead">
            Aquela história que só você sabe contar. Aquele conto que você inventou pros seus filhos.
            Aquele momento da família que merecia virar filme. Até hoje, fazer isso exigia estúdio, equipe
            e muito dinheiro. <b style={{ color: '#fff' }}>Não exige mais.</b>
          </p>
          <div className="cards c4" style={{ textAlign: 'left' }}>
            <div className="card">
              <div className="ico">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21s-7-4.4-9.5-9C.8 8.6 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.2 4.6 4.5 8-2.5 4.6-9.5 9-9.5 9z" />
                </svg>
              </div>
              <h3>Sua história de vida</h3>
              <p>O testemunho, a superação, a virada — contado como um filme que emociona quem assiste.</p>
            </div>
            <div className="card">
              <div className="ico">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="8" width="18" height="13" rx="2" />
                  <path d="M12 8v13M3 12h18M12 8S10 3 7.5 4 9 8 12 8zm0 0s2-5 4.5-4S15 8 12 8z" />
                </svg>
              </div>
              <h3>Um presente inesquecível</h3>
              <p>Aniversário, Dia das Mães, pedido de casamento: um filme com quem você ama como protagonista.</p>
            </div>
            <div className="card">
              <div className="ico">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
                  <path d="M8 7h8M8 11h6" />
                </svg>
              </div>
              <h3>Histórias para os filhos</h3>
              <p>Contos, fábulas e histórias bíblicas em desenho animado, do jeito que as crianças amam assistir.</p>
            </div>
            <div className="card">
              <div className="ico">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3 6 6 .9-4.5 4.4 1 6.2L12 16.6 6.5 19.5l1-6.2L3 8.9 9 8z" />
                </svg>
              </div>
              <h3>Aquele sonho antigo</h3>
              <p>Criar o seu próprio desenho animado. Sim, você. Hoje dá pra tirar do papel com o celular.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DOIS ESTILOS ── */}
      <section style={{ background: 'var(--bg2)' }}>
        <div className="wrap center">
          <span className="eyebrow">Você escolhe</span>
          <h2>
            Desenho animado <span className="lime">ou</span> cinema realista
          </h2>
          <p className="lead">
            A mesma história, dois mundos. No curso você aprende os dois estilos — e decide qual combina
            com o seu filme.
          </p>
          <div className="switcher" role="tablist">
            <button
              className={stylePair === 0 ? 'on' : ''}
              onClick={() => setStylePair(0)}
              type="button"
            >
              Família no jardim
            </button>
            <button
              className={stylePair === 1 ? 'on' : ''}
              onClick={() => setStylePair(1)}
              type="button"
            >
              A gaveta de histórias
            </button>
          </div>
          <div className="styles">
            <div className="style d">
              <video
                key={`d-${stylePair}`}
                src={stylePair === 0 ? '/courses/grok/video/jardim.mp4' : '/courses/grok/video/gaveta.mp4'}
                poster={stylePair === 0 ? '/courses/grok/img/jardim.jpg' : '/courses/grok/img/gaveta.jpg'}
                muted
                loop
                playsInline
                autoPlay
              />
              <span className="lbl">Desenho animado</span>
            </div>
            <div className="style r">
              <video
                key={`r-${stylePair}`}
                src={stylePair === 0 ? '/courses/grok/video/jardim-real.mp4' : '/courses/grok/video/real.mp4'}
                poster={stylePair === 0 ? '/courses/grok/img/jardim-real.jpg' : '/courses/grok/img/real.jpg'}
                muted
                loop
                playsInline
                autoPlay
              />
              <span className="lbl">Cinema realista</span>
            </div>
          </div>
          <p className="same">Mesmo método, mesma ferramenta. Só muda uma palavra no pedido.</p>
        </div>
      </section>

      {/* ── MECANISMO ÚNICO ── */}
      <section>
        <div className="wrap center">
          <span className="eyebrow">O segredo</span>
          <h2>
            Esqueça as 5 ferramentas. <span className="lime">Use só uma.</span>
          </h2>
          <p className="lead">
            A maioria dos tutoriais te manda pular de aplicativo em aplicativo, pagar várias assinaturas
            em dólar e editar tudo no final. O nosso método faz o filme inteiro dentro do Grok.
          </p>
          <div className="versus" style={{ textAlign: 'left' }}>
            <div className="vs bad">
              <h3>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.4">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                O jeito complicado
              </h3>
              <ul>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Roteiro numa IA, imagem em outra, vídeo em outra
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Várias contas, várias assinaturas, tudo em inglês
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Personagem muda de cara a cada cena
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Precisa de computador bom e programa de edição
                </li>
              </ul>
            </div>
            <div className="vs good">
              <h3>
                <img
                  src="/courses/grok/img/grok-mark.svg"
                  alt=""
                  width="22"
                  height="22"
                  style={{ filter: 'invert(1)' }}
                />
                O método "Só o Grok"
              </h3>
              <ul>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Roteiro, personagens, imagens e vídeo num lugar só
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Tudo em português, com pedidos (prompts) prontos pra copiar
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Ficha do personagem: o mesmo rosto do começo ao fim
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Funciona no celular que você já tem
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 PASSOS ── */}
      <section style={{ background: 'var(--bg2)' }}>
        <div className="wrap center">
          <span className="eyebrow">Como funciona</span>
          <h2>
            Seu filme em <span className="lime">4 passos</span>
          </h2>
          <p className="lead">
            No curso, você constrói um filme de verdade junto comigo, clique por clique: a história da
            Vó Rosa ensinando o neto Pedro a fazer o bolo da família.
          </p>
          <div className="steps" style={{ textAlign: 'left' }}>
            <div className="step">
              <img src="/courses/grok/img/gaveta.jpg" alt="" loading="lazy" />
              <div>
                <div className="n">Passo 1</div>
                <h3>A história</h3>
                <p>O Grok escreve o roteiro com você. Você só conta a ideia, do seu jeito.</p>
              </div>
            </div>
            <div className="step">
              <img src="/courses/grok/img/curso-ficha-rosa-desenho.jpg" alt="" loading="lazy" />
              <div>
                <div className="n">Passo 2</div>
                <h3>Os personagens</h3>
                <p>A ficha que mantém o mesmo rosto em todas as cenas — em desenho ou realista.</p>
              </div>
            </div>
            <div className="step">
              <img src="/courses/grok/img/curso-cena01-desenho.jpg" alt="" loading="lazy" />
              <div>
                <div className="n">Passo 3</div>
                <h3>As imagens</h3>
                <p>Cada cena do roteiro vira uma imagem de cinema. Conferir, corrigir e baixar.</p>
              </div>
            </div>
            <div className="step">
              <img src="/courses/grok/img/bolo.jpg" alt="" loading="lazy" />
              <div>
                <div className="n">Passo 4</div>
                <h3>O filme pronto</h3>
                <p>As imagens ganham movimento, voz e emoção. Aperte o play e assista ao seu filme.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTEÚDO ── */}
      <section id="conteudo">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">O que você vai aprender</span>
            <h2>
              4 módulos. 12 aulas. <span className="lime">Zero enrolação.</span>
            </h2>
            <p className="lead">
              Aulas curtas, com cada clique mostrado devagar. Cada módulo vem com um PDF de pedidos
              prontos pra você copiar e colar.
            </p>
          </div>
          <div className="mods" style={{ maxWidth: 820, marginLeft: 'auto', marginRight: 'auto' }}>
            <details className="mod" open>
              <summary>
                <span className="num">1</span>
                <span className="tt">
                  <small>Módulo 1</small>
                  <b>O roteiro</b>
                </span>
                <svg className="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <ol>
                <li><span>1.1</span>Boas-vindas: o filme que vamos fazer juntos</li>
                <li><span>1.2</span>Abrindo o Grok e pedindo o roteiro</li>
                <li><span>1.3</span>Ajustando o roteiro e as regras de ouro</li>
              </ol>
              <span className="pdf">📄 PDF: pedidos prontos de roteiro</span>
            </details>
            <details className="mod">
              <summary>
                <span className="num">2</span>
                <span className="tt">
                  <small>Módulo 2</small>
                  <b>Os personagens</b>
                </span>
                <svg className="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <ol>
                <li><span>2.1</span>A ficha do personagem e o Grok Imagine</li>
                <li><span>2.2</span>Ficha em desenho animado</li>
                <li><span>2.3</span>Ficha em cinema realista + checklist</li>
              </ol>
              <span className="pdf">📄 PDF: fichas de personagem prontas</span>
            </details>
            <details className="mod">
              <summary>
                <span className="num">3</span>
                <span className="tt">
                  <small>Módulo 3</small>
                  <b>As imagens</b>
                </span>
                <svg className="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <ol>
                <li><span>3.1</span>Pedindo os pedidos de imagem</li>
                <li><span>3.2</span>Gerando a cena com as fichas</li>
                <li><span>3.3</span>Conferindo, corrigindo e baixando</li>
              </ol>
              <span className="pdf">📄 PDF: pedidos de imagem por cena</span>
            </details>
            <details className="mod">
              <summary>
                <span className="num">4</span>
                <span className="tt">
                  <small>Módulo 4</small>
                  <b>Os vídeos</b>
                </span>
                <svg className="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <ol>
                <li><span>4.1</span>Os pedidos de vídeo e os três tipos de cena</li>
                <li><span>4.2</span>Gerando o vídeo da cena</li>
                <li><span>4.3</span>Corrigindo, finalizando e assistindo ao seu filme</li>
              </ol>
              <span className="pdf">📄 PDF: pedidos de vídeo prontos</span>
            </details>
          </div>
          <div className="center" style={{ marginTop: 36 }}>
            <Link className="btn cta" to={CHECKOUT_ROUTE} style={{ margin: '0 auto' }}>
              Quero ter acesso agora
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── GALERIA ── */}
      <section style={{ background: 'var(--bg2)' }}>
        <div className="wrap center">
          <span className="eyebrow">Imagine o que você vai criar</span>
          <h2>
            Se dá pra imaginar, <span className="lime">dá pra filmar.</span>
          </h2>
          <p className="lead">
            Exemplos feitos com o mesmo método que você vai aprender. Nenhum estúdio. Nenhum programa
            de edição.
          </p>
          <div className="gallery" style={{ textAlign: 'left' }}>
            <div className="gi">
              <video src="/courses/grok/video/arca.mp4" poster="/courses/grok/img/arca.jpg" muted loop playsInline autoPlay />
              <div className="cap">
                <small>Desenho</small>Histórias bíblicas para os filhos
              </div>
            </div>
            <div className="gi">
              <video src="/courses/grok/video/sorrindo.mp4" poster="/courses/grok/img/sorrindo.jpg" muted loop playsInline autoPlay />
              <div className="cap">
                <small>Desenho</small>Sua história de superação
              </div>
            </div>
            <div className="gi">
              <video src="/courses/grok/video/bolo-real.mp4" poster="/courses/grok/img/bolo-real.jpg" muted loop playsInline autoPlay />
              <div className="cap">
                <small>Realista</small>Presente para a vó
              </div>
            </div>
            <div className="gi">
              <video src="/courses/grok/video/voando.mp4" poster="/courses/grok/img/voando.jpg" muted loop playsInline autoPlay />
              <div className="cap">
                <small>Desenho</small>O conto que estava na gaveta
              </div>
            </div>
            <div className="gi">
              <video src="/courses/grok/video/familia.mp4" poster="/courses/grok/img/familia.jpg" muted loop playsInline autoPlay />
              <div className="cap">
                <small>Desenho</small>Momentos em família
              </div>
            </div>
            <div className="gi">
              <video src="/courses/grok/video/davi.mp4" poster="/courses/grok/img/davi.jpg" muted loop playsInline autoPlay />
              <div className="cap">
                <small>Desenho</small>Davi e Golias
              </div>
            </div>
            <div className="gi">
              <video src="/courses/grok/video/real.mp4" poster="/courses/grok/img/real.jpg" muted loop playsInline autoPlay />
              <div className="cap">
                <small>Realista</small>Memórias que viram cinema
              </div>
            </div>
            <div className="gi">
              <video src="/courses/grok/video/daniel.mp4" poster="/courses/grok/img/daniel.jpg" muted loop playsInline autoPlay />
              <div className="cap">
                <small>Desenho</small>Daniel na cova dos leões
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRA QUEM É ── */}
      <section>
        <div className="wrap center">
          <span className="eyebrow">Pra quem é</span>
          <h2>
            Pra qualquer pessoa. <span className="lime">Só precisa querer.</span>
          </h2>
          <p className="lead">
            Não precisa entender de tecnologia. Não precisa ser o mais inteligente. Se você sabe mandar
            mensagem no celular, você consegue.
          </p>
          <div className="fit" style={{ textAlign: 'left' }}>
            <div className="card yes">
              <h3>Esse curso é pra você se:</h3>
              <ul>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Você tem uma história pra contar e nunca soube por onde começar
                </li>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Quer dar um presente que ninguém mais vai dar
                </li>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Quer criar conteúdo bonito pra sua família, igreja, escola ou redes sociais
                </li>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Sempre achou IA difícil demais — e quer aprender do zero, devagar
                </li>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Quer aprender uma habilidade nova sem gastar muito
                </li>
              </ul>
            </div>
            <div className="card no">
              <h3>Não é pra você se:</h3>
              <ul>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Procura fórmula de dinheiro fácil — aqui é sobre criar filmes
                </li>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Já é editor profissional e domina vários softwares de IA
                </li>
                <li>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                  Não quer colocar a mão na massa nem por 15 minutos por dia
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUTORIDADE / PROVA ── */}
      <section style={{ background: 'var(--bg2)' }}>
        <div className="wrap">
          <div className="proof">
            <div className="pic">
              <img
                src="/courses/grok/img/professor.jpg"
                alt="Professor PicPlus em desenho animado"
                loading="lazy"
              />
              <span className="seal">
                Este aqui também
                <br />
                foi feito no Grok 😉
              </span>
            </div>
            <div>
              <span className="eyebrow">A prova mais honesta</span>
              <h2>
                O vídeo que te trouxe até aqui <span className="lime">foi feito assim.</span>
              </h2>
              <p className="lead">
                Os anúncios que você viu, as cenas desta página e até o “professor” em desenho animado:
                tudo foi criado pela equipe PicPlus usando exatamente o método do curso. Sem estúdio, sem
                animador, sem programa de edição de IA.
              </p>
              <div className="stats">
                <div className="stat">
                  <b>1</b>
                  <span>ferramenta de IA</span>
                </div>
                <div className="stat">
                  <b>2</b>
                  <span>estilos: desenho e realista</span>
                </div>
                <div className="stat">
                  <b>12</b>
                  <span>aulas passo a passo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OFERTA ── */}
      <section className="offer" id="oferta">
        <div
          className="glow"
          style={{
            width: 600,
            height: 600,
            background: '#B6E829',
            opacity: 0.1,
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        ></div>
        <div className="wrap center">
          <span className="eyebrow">Sua vaga</span>
          <h2>
            Tudo o que você recebe <span className="lime">hoje</span>
          </h2>
          <div className="offer-box" style={{ textAlign: 'left' }} ref={offerRef}>
            <span className="ribbon">Acesso imediato</span>
            <div className="offer-cover">
              <img
                src="/courses/grok/img/og-capa.jpg"
                alt="Curso Filmes com IA usando só o Grok"
                loading="lazy"
              />
            </div>
            <ul className="stack">
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <div>
                  <b>Curso completo: Filmes com IA usando só o Grok</b>
                  <small>4 módulos · 12 aulas · do roteiro ao filme pronto</small>
                </div>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <div>
                  <b>Os dois estilos: desenho animado e cinema realista</b>
                  <small>Você escolhe o visual de cada filme</small>
                </div>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <div>
                  <b>
                    <span className="bonus">Bônus</span>4 PDFs de pedidos prontos
                  </b>
                  <small>Copie, cole no Grok e pronto — um para cada etapa</small>
                </div>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <div>
                  <b>
                    <span className="bonus">Bônus</span>Fichas de personagem + checklist
                  </b>
                  <small>O segredo pro personagem não mudar de cara</small>
                </div>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <div>
                  <b>Acesso pelo celular ou computador</b>
                  <small>Assista quando e onde quiser · 12 meses de acesso</small>
                </div>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <div>
                  <b>Garantia incondicional de 7 dias</b>
                  <small>Não gostou? Devolvemos 100% do valor</small>
                </div>
              </li>
            </ul>
            <div className="price">
              <div className="de">Tudo isso por apenas</div>
              <span className="x">10x de</span>
              <span className="big">R$ 9,70</span>
              <div className="vista">ou R$ 97,90 à vista</div>
              <span className="day">☕ Menos que um cafezinho por semana</span>
            </div>
            <Link className="btn cta buy" to={CHECKOUT_ROUTE}>
              Comprar agora
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <div className="pay">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B6E829" strokeWidth="2.4">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Compra 100% segura
              </span>
              <span>Pix</span>
              <span>Cartão de crédito</span>
              <span>Boleto</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── GARANTIA ── */}
      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="guarantee">
            <div className="g-seal">
              <svg viewBox="0 0 200 200">
                <defs>
                  <path id="circG" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
                </defs>
                <circle cx="100" cy="100" r="96" fill="#B6E829" />
                <circle cx="100" cy="100" r="64" fill="#0A0A0A" />
                <text fontFamily="Poppins" fontWeight="700" fontSize="13" letterSpacing="4" fill="#0A0A0A">
                  <textPath href="#circG">GARANTIA INCONDICIONAL • RISCO ZERO • </textPath>
                </text>
                <text x="100" y="108" textAnchor="middle" fontFamily="Hero, Poppins" fontWeight="700" fontSize="52" fill="#B6E829">
                  7
                </text>
                <text x="100" y="132" textAnchor="middle" fontFamily="Poppins" fontWeight="600" fontSize="13" fill="#fff" letterSpacing="2">
                  DIAS
                </text>
              </svg>
            </div>
            <div>
              <h2>
                O risco é todo <span className="lime">nosso</span>.
              </h2>
              <p>
                Entre, assista às aulas, faça o seu primeiro filme. Se em até 7 dias você achar que o
                curso não é pra você, por qualquer motivo, é só pedir: devolvemos 100% do seu dinheiro.
                Sem perguntas, sem burocracia. Você não tem nada a perder — só uma história a ganhar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DOIS CAMINHOS ── */}
      <section>
        <div className="wrap center">
          <span className="eyebrow">Agora é com você</span>
          <h2>
            Daqui a 7 dias, <span className="lime">duas histórias</span> são possíveis
          </h2>
          <div className="paths" style={{ textAlign: 'left' }}>
            <div className="path">
              <small>Caminho 1</small>
              <h3>Tudo continua igual</h3>
              <p>
                A história continua na gaveta. A ideia continua só na sua cabeça. E a próxima data
                especial chega com o mesmo presente de sempre.
              </p>
            </div>
            <div className="path good">
              <small>Caminho 2</small>
              <h3>Você aperta o play no seu filme</h3>
              <p>
                Você reúne a família, aperta o play e assiste a uma história que <b>você</b> criou — e
                vê no rosto de cada um o que isso significa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: 'var(--bg2)' }}>
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Dúvidas</span>
            <h2>
              Perguntas <span className="lime">frequentes</span>
            </h2>
          </div>
          <div className="faq">
            <details>
              <summary>Eu não entendo nada de tecnologia. Vou conseguir?</summary>
              <p>
                Vai. O curso foi feito pra quem está começando do zero. Cada clique é mostrado devagar,
                na tela, e você recebe os pedidos (prompts) prontos pra copiar e colar. Se você sabe
                mandar mensagem no celular, você consegue.
              </p>
            </details>
            <details>
              <summary>Preciso de computador?</summary>
              <p>Não. Dá pra fazer tudo pelo celular. Se preferir, também funciona no computador.</p>
            </details>
            <details>
              <summary>Preciso pagar o Grok?</summary>
              <p>
                Você pode começar com a conta gratuita do Grok, que tem um limite de gerações por dia. Se
                quiser produzir mais rápido, o próprio Grok oferece planos pagos — é opcional e não é
                cobrado por nós.
              </p>
            </details>
            <details>
              <summary>Preciso saber editar vídeo?</summary>
              <p>
                Não. O método faz o filme inteiro dentro do Grok — você não vai precisar de nenhum
                programa de edição.
              </p>
            </details>
            <details>
              <summary>Quanto tempo leva pra fazer o primeiro filme?</summary>
              <p>
                As aulas são curtas e diretas. Você vai construindo o filme junto comigo, etapa por etapa,
                no seu ritmo — dá pra assistir uma aula por dia ou tudo de uma vez.
              </p>
            </details>
            <details>
              <summary>Posso fazer filmes de qualquer tema?</summary>
              <p>
                Pode: histórias de família, contos infantis, histórias bíblicas, testemunhos, homenagens,
                presentes de aniversário… O método é o mesmo pra qualquer história.
              </p>
            </details>
            <details>
              <summary>Como recebo o acesso?</summary>
              <p>
                Logo depois da confirmação do pagamento, você recebe no seu e-mail os dados de acesso à
                área de membros. No Pix e no cartão, a liberação é imediata.
              </p>
            </details>
            <details>
              <summary>Por quanto tempo posso assistir?</summary>
              <p>Você tem 12 meses de acesso pra assistir quantas vezes quiser.</p>
            </details>
            <details>
              <summary>E se eu não gostar?</summary>
              <p>
                Você tem 7 dias de garantia incondicional. Se não gostar, por qualquer motivo, é só
                pedir o reembolso que devolvemos 100% do valor.
              </p>
            </details>
            <details>
              <summary>O parcelamento tem juros?</summary>
              <p>
                O valor de 10x de R$ 9,70 já aparece no checkout. Você também pode pagar à vista no Pix
                ou no cartão.
              </p>
            </details>
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: 14 }}>
              Ainda tem alguma dúvida sobre o curso?
            </p>
            <a
              href="https://wa.me/557991424233?text=Oi!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20curso%20Filmes%20com%20IA%20usando%20s%C3%B3%20o%20Grok."
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: 999,
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#B6E829">
                <path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.7L.5 23.5l5.9-1.5A11.8 11.8 0 0 0 20.5 3.5zM12 21.4a9.6 9.6 0 0 1-4.9-1.3l-.4-.2-3.5.9.9-3.4-.2-.4A9.7 9.7 0 1 1 12 21.4zm5.3-7.2c-.3-.1-1.7-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.6.1a7.9 7.9 0 0 1-3.9-3.4c-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.5 13.5 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z" />
              </svg>
              Falar no WhatsApp: (79) 9142-4233
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="final">
        <div className="grid-bg"></div>
        <div
          className="glow"
          style={{
            width: 640,
            height: 640,
            background: '#B6E829',
            opacity: 0.12,
            bottom: -320,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        ></div>
        <div className="wrap">
          <span className="eyebrow">Última cena</span>
          <h2>
            A sua história merece <span className="lime">ser vista.</span>
          </h2>
          <p className="lead" style={{ margin: '16px auto 0' }}>
            Comece hoje o seu primeiro filme — com garantia de 7 dias e por menos que um lanche por mês.
          </p>
          <div className="price-mini" style={{ justifyContent: 'center', marginTop: 26 }}>
            <small>10x de</small>
            <strong>R$ 9,70</strong>
          </div>
          <Link className="btn cta buy" to={CHECKOUT_ROUTE}>
            Quero criar meu primeiro filme
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <div className="trust">
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Acesso imediato
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Garantia de 7 dias
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Celular ou computador
            </span>
          </div>
        </div>
      </section>

      {/* ── BARRA FIXA (STICKY BOTTOM) ── */}
      <div className={`sticky ${showSticky ? 'show' : ''}`} id="sticky">
        <div className="p">
          <small>10x de</small>
          <b>R$ 9,70</b>
        </div>
        <Link className="btn cta buy" to={CHECKOUT_ROUTE}>
          Comprar agora
        </Link>
      </div>

      {/* ── MODAL DE SAÍDA (DESKTOP) ── */}
      <div
        className={`modal ${showExitModal ? 'on' : ''}`}
        id="exit"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowExitModal(false);
        }}
      >
        <div className="box">
          <button className="x" aria-label="Fechar" onClick={() => setShowExitModal(false)}>
            ×
          </button>
          <span className="eyebrow">Espera!</span>
          <h3>
            Você pode testar <span className="lime">sem risco</span>.
          </h3>
          <p>
            Entre, faça seu primeiro filme e, se não gostar em até 7 dias, devolvemos 100% do valor.
            Só 10x de R$ 9,70.
          </p>
          <Link className="btn cta buy" to={CHECKOUT_ROUTE}>
            Quero testar agora
          </Link>
        </div>
      </div>
    </LpRoot>
  );
}
