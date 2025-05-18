import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Loading messages that will cycle
const loadingMessages = [
  "Cloning repository...",
  "Analyzing commit history...",
  "Examining JavaScript code...",
  "Detecting obfuscation patterns...",
  "Calculating obfuscation scores...",
  "Generating timeline data...",
  "Almost there..."
];

const LoadingScreen = ({ progress = 0, message = 'Processing repository...' }) => {
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle through loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const nextIndex = (prev + 1) % loadingMessages.length;
        setCurrentMessage(loadingMessages[nextIndex]);
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop"
              }}
              className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-blue-600"
            />
            <span className="text-gradient">Analyzing Repository</span>
          </CardTitle>
          <CardDescription className="h-6">
            <span style={{display: 'block', height: '100%'}}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMessage}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentMessage}
                </motion.div>
              </AnimatePresence>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between items-center">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatType: "loop",
                      delay: i * 0.2
                    }}
                    className="w-1 h-1 rounded-full"
                    style={{
                      background: `var(--chart-${(i % 5) + 1})`
                    }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium">{Math.round(progress)}%</p>
            </div>
          </div>

          <div className="flex justify-center py-4">
            <div className="relative w-24 h-24">
              {/* Outer spinning circle */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-purple-500/20 rounded-full border-t-purple-500 border-r-purple-500"
              />

              {/* Inner spinning circle (opposite direction) */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 border-4 border-blue-500/20 rounded-full border-b-blue-500 border-l-blue-500"
              />

              {/* Center dot */}
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 m-auto w-4 h-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              />
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            This may take a few moments...
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LoadingScreen;
