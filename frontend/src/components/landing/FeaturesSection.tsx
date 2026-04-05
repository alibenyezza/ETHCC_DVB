"use client";
import { useEffect, useRef, useState } from 'react';
import './FeaturesSection.css';

const features = [
  {
    num: '01',
    title: 'One Blind AI Per Chain',
    description:
      'ZENITH deploys one autonomous AI agent per supported chain via 0G Compute. Each agent observes, reasons, and proposes strategies. Crucially, each agent is completely blind to what happens on every other chain.',
  },
  {
    num: '02',
    title: 'Chainlink TEE Validation',
    description:
      'A Chainlink Confidential Compute TEE (Intel SGX) sits at the center. It receives encrypted proposals every 30s, validates strategies against security rules, and prevents single points of failure.',
  },
  {
    num: '03',
    title: 'CCTP Cross-Chain Reallocation',
    description:
      'Every 6-7 hours, the TEE compares yield curves from all agents and redistributes capital between chains natively via Circle CCTP. Capital flows naturally toward the best-performing chains.',
  },
  {
    num: '04',
    title: 'Arc & 0G Settlement',
    description:
      'Users deposit USDC on Arc (Circle L1) to receive share tokens. AI Compute and memory run on 0G Network. The TEE execution attestations are anchored on 0G Chain for public verifiability without revealing the strategy.',
  },
];

export default function FeaturesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(25);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(i);
            setProgress(((i + 1) / features.length) * 100);
          }
        },
        { threshold: 0.35, rootMargin: '-5% 0px -45% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(obs => obs.disconnect());
  }, []);

  return (
    <section className="features-section">
      {/* Sticky header */}
      <div className="features-header">
        <div className="features-progress-bar">
          <div className="features-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="features-header-inner">
          <h2 className="features-header-title">
            How ZENITH Works<span className="features-header-dot">.</span>
          </h2>
          <div className="features-header-counter">
            {String(activeIndex + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Items */}
      <ul className="features-list">
        {features.map((f, i) => (
          <li
            key={f.num}
            ref={el => { itemRefs.current[i] = el; }}
            className={`features-item${i === activeIndex ? ' active' : ''}`}
          >
            <div className="features-item-inner">
              <div className="features-item-number">
                <span className={`features-num${i === activeIndex ? ' active' : ''}`}>
                  {f.num}.
                </span>
              </div>
              <div className="features-item-content">
                <h3 className={`features-item-title${i === activeIndex ? ' active' : ''}`}>
                  {f.title}
                </h3>
                <p className={`features-item-desc${i === activeIndex ? ' active' : ''}`}>
                  {f.description}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
