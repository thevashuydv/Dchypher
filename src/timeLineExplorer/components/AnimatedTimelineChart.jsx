import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Tech-themed colors for the chart
const CHART_COLORS = {
  primary: '#8b5cf6', // Purple
  secondary: '#3b82f6', // Blue
  accent: '#14b8a6', // Teal
  highlight: '#f59e0b', // Amber
  lines: 'rgba(139, 92, 246, 0.5)', // Semi-transparent purple
  pointGlow: 'rgba(139, 92, 246, 0.2)', // Very light purple for glow effect
};

const AnimatedTimelineChart = ({ timelineData }) => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const containerRef = useRef(null);

  // Format dates for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate the maximum score for scaling
  const maxScore = Math.max(...timelineData.map(item => item.score));

  // Calculate the width of each point based on the container width
  const pointWidth = 100 / (timelineData.length - 1);

  // Animation for the line connecting points
  const lineAnimation = useSpring({
    from: { width: '0%' },
    to: { width: '100%' },
    config: { duration: 1500 },
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-gradient">Obfuscation Timeline</CardTitle>
        <CardDescription>
          Visualization of obfuscation scores over time for the selected JavaScript file
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative h-[400px] w-full mt-10 mb-16"
        >
          {/* Animated horizontal line */}
          <animated.div
            style={lineAnimation}
            className="absolute bottom-0 h-[2px] bg-primary/50"
          />

          {/* Timeline points */}
          <div className="absolute inset-0">
            {timelineData.map((item, index) => {
              // Calculate position as percentage
              const xPos = index * pointWidth;
              const yPos = 100 - (item.score / maxScore * 100);

              return (
                <div key={item.commitHash} className="absolute" style={{ left: `${xPos}%`, bottom: `${item.score / maxScore * 100}%` }}>
                  {/* Animated point */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.2, duration: 0.5 }}
                    className={`relative ${selectedPoint === index ? 'z-10' : 'z-0'}`}
                  >
                    {/* Point */}
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className="h-4 w-4 rounded-full cursor-pointer"
                      style={{
                        background: selectedPoint === index
                          ? CHART_COLORS.primary
                          : CHART_COLORS.primary + 'BB',
                        boxShadow: selectedPoint === index
                          ? `0 0 0 4px ${CHART_COLORS.pointGlow}, 0 0 10px ${CHART_COLORS.primary}`
                          : 'none'
                      }}
                      onClick={() => setSelectedPoint(selectedPoint === index ? null : index)}
                    />

                    {/* Date label */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -bottom-8 text-xs text-muted-foreground whitespace-nowrap"
                      style={{ transform: 'rotate(-45deg)', transformOrigin: 'left top' }}
                    >
                      {formatDate(item.timestamp)}
                    </div>

                    {/* Score label */}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-6 text-xs font-medium">
                      {item.score}
                    </div>

                    {/* Detail popup */}
                    <AnimatePresence>
                      {selectedPoint === index && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className={`absolute ${
                            xPos > 50 ? 'right-0' : 'left-0'
                          } top-0 mt-6 p-4 bg-card border rounded-lg shadow-lg w-64 z-50`}
                        >
                          <h4 className="font-medium text-sm mb-2">Commit Details</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commit:</span>
                              <span className="font-mono">{item.commitHash.substring(0, 7)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Date:</span>
                              <span>{formatDate(item.timestamp)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Score:</span>
                              <span>{item.score}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Eval Count:</span>
                              <span>{item.metrics.evalCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Short Variables:</span>
                              <span>{item.metrics.shortVarCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Minified:</span>
                              <span>{item.metrics.isMinified ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Animated connecting lines between points */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
            <g>
              {timelineData.map((item, index) => {
                if (index === timelineData.length - 1) return null;

                const currentX = index * pointWidth;
                const currentY = 100 - (item.score / maxScore * 100);
                const nextX = (index + 1) * pointWidth;
                const nextY = 100 - (timelineData[index + 1].score / maxScore * 100);

                return (
                  <motion.line
                    key={`line-${index}`}
                    x1={`${currentX}%`}
                    y1={`${currentY}%`}
                    x2={`${nextX}%`}
                    y2={`${nextY}%`}
                    stroke={CHART_COLORS.lines}
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: index * 0.2, duration: 0.8 }}
                  />
                );
              })}
            </g>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnimatedTimelineChart;
