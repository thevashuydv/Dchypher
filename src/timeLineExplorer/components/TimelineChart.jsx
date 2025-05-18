import { useRef, useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Set default chart colors
ChartJS.defaults.color = '#71717a'; // Default text color

const TimelineChart = ({ timelineData }) => {
  const chartRef = useRef(null);
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

  // Format dates for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Prepare data for the chart
  const chartData = {
    labels: timelineData.map(item => formatDate(item.timestamp)),
    datasets: [
      {
        label: 'Obfuscation Score',
        data: timelineData.map(item => item.score),
        borderColor: isDarkMode ? 'rgba(168, 85, 247, 0.8)' : 'rgba(79, 70, 229, 0.8)',
        backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(79, 70, 229, 0.2)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: isDarkMode ? 'rgba(168, 85, 247, 1)' : 'rgba(79, 70, 229, 1)',
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isDarkMode ? '#e4e4e7' : '#3f3f46',
        }
      },
      title: {
        display: true,
        text: 'Obfuscation Timeline',
        color: isDarkMode ? '#e4e4e7' : '#3f3f46',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
        titleColor: isDarkMode ? '#e4e4e7' : '#3f3f46',
        bodyColor: isDarkMode ? '#d4d4d8' : '#52525b',
        borderColor: isDarkMode ? '#3f3f46' : '#e4e4e7',
        borderWidth: 1,
        callbacks: {
          afterLabel: function(context) {
            const index = context.dataIndex;
            const item = timelineData[index];
            return [
              `Commit: ${item.commitHash.substring(0, 7)}`,
              `Eval Count: ${item.metrics.evalCount}`,
              `Short Variables: ${item.metrics.shortVarCount}`,
              `Minified: ${item.metrics.isMinified ? 'Yes' : 'No'}`,
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        border: {
          color: isDarkMode ? '#3f3f46' : '#e4e4e7',
        },
        grid: {
          color: isDarkMode ? '#27272a' : '#f4f4f5',
        },
        ticks: {
          color: isDarkMode ? '#a1a1aa' : '#71717a',
        },
        title: {
          display: true,
          text: 'Obfuscation Score',
          color: isDarkMode ? '#e4e4e7' : '#3f3f46',
        },
      },
      x: {
        border: {
          color: isDarkMode ? '#3f3f46' : '#e4e4e7',
        },
        grid: {
          color: isDarkMode ? '#27272a' : '#f4f4f5',
        },
        ticks: {
          color: isDarkMode ? '#a1a1aa' : '#71717a',
        },
        title: {
          display: true,
          text: 'Date',
          color: isDarkMode ? '#e4e4e7' : '#3f3f46',
        },
      },
    },
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Obfuscation Timeline</CardTitle>
        <CardDescription>
          Visualization of obfuscation scores over time for the selected JavaScript file
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <Line ref={chartRef} data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default TimelineChart;
