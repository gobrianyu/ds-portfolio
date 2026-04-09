import React, { useState, useEffect, useRef } from 'react';

interface RigidWrapperProps {
  children: React.ReactNode;
  width?: number;
}

export const RigidWrapper: React.FC<RigidWrapperProps> = ({ 
  children, 
  width = 1200 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | string>('auto');

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const paddingX = 96; // px-12 = 48px * 2
        const availableWidth = Math.max(0, containerWidth - paddingX);
        const newScale = Math.min(1, availableWidth / width);
        setScale(newScale);
        
        // Update the container height to match the scaled content height
        const contentHeight = contentRef.current.offsetHeight;
        setHeight(contentHeight * newScale);
      }
    };

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also observe the content for height changes
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    updateScale();
    return () => resizeObserver.disconnect();
  }, [width]);

  return (
    <div 
      ref={containerRef} 
      className="w-full relative py-8 px-12 overflow-visible"
      style={{ height: typeof height === 'number' ? height + 64 : height }}
    >
      <div 
        ref={contentRef}
        style={{ 
          width: width,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          position: 'absolute',
          top: 32,
          left: '50%',
          marginLeft: -(width / 2)
        }}
      >
        {children}
      </div>
    </div>
  );
};
