import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Color coding for scores
const getScoreColor = (score) => {
  if (score >= 80) return 'bg-red-500 text-white';
  if (score >= 50) return 'bg-yellow-400 text-black';
  if (score > 0) return 'bg-blue-500 text-white';
  return 'bg-green-500 text-white';
};

const TimelineChart = ({ timelineData }) => {
  const [selected, setSelected] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode and update when it changes
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    // Initial check
    checkDarkMode();

    // Set up observer to detect theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Sort by date ascending
  const sorted = [...timelineData].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Obfuscation Timeline</CardTitle>
        <CardDescription>
          Each commit is shown as a step. Click a step for details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 relative border-l-2 border-primary/30 pl-6">
          {sorted.map((item, idx) => (
            <div key={item.commitHash} className="relative group">
              {/* Timeline dot */}
              <div className={`absolute -left-7 top-2 w-5 h-5 rounded-full border-4 border-background shadow ${getScoreColor(item.score)} flex items-center justify-center font-bold text-xs`}>{idx+1}</div>
              <div
                className={`p-4 rounded-md bg-card/80 border border-border shadow transition cursor-pointer hover:bg-primary/10 ${selected === idx ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelected(selected === idx ? null : idx)}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded ${getScoreColor(item.score)}`}>Score: {item.score}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleDateString()}</span>
                  <span className="text-xs font-mono text-muted-foreground">{item.commitHash.substring(0, 7)}</span>
                </div>
                {selected === idx && (
                  <div className="mt-3 text-sm grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Eval Count:</span> {item.metrics.evalCount}
                    </div>
                    <div>
                      <span className="font-medium">Short Vars:</span> {item.metrics.shortVarCount}
                    </div>
                    <div>
                      <span className="font-medium">Minified:</span> {item.metrics.isMinified ? 'Yes' : 'No'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimelineChart;
