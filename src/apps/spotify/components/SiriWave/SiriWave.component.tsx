import { useEffect, useState, useRef } from 'react';
import Siri from 'siriwave';
import styles from './siriWave.module.css';

interface SiriwaveProps {
  started: boolean;
  speed?: number;
}

export default function Siriwave({ started, speed = 0.2 }: SiriwaveProps) {
  const container = useRef<HTMLDivElement>(null);
  const [siri, setSiri] = useState<InstanceType<typeof Siri> | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const instance = new Siri({ speed, amplitude: 1.5, container: container.current });
    setSiri(instance);
    return () => {
      instance.stop();
      setSiri(null);
    };
  }, [speed]);

  useEffect(() => {
    if (siri) {
      if (!started) siri.stop();
      else siri.start();
    }
  }, [started, siri]);

  return <div ref={container} className={styles.container} />;
}
