import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CommitDetails = ({ timelineData }) => {
  const [selectedCommit, setSelectedCommit] = useState(null);

  // Format date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle commit selection
  const handleCommitSelect = (commit) => {
    setSelectedCommit(commit === selectedCommit ? null : commit);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-gradient">Commit History</CardTitle>
        <CardDescription>
          Detailed information about each commit and its obfuscation metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-2 font-medium text-sm border-b pb-2">
            <div>Date</div>
            <div>Commit</div>
            <div>Score</div>
            <div>Metrics</div>
            <div></div>
          </div>

          {timelineData.map((commit) => (
            <div key={commit.commitHash} className="grid grid-cols-5 gap-2 text-sm border-b pb-2">
              <div>{formatDate(commit.timestamp)}</div>
              <div className="font-mono">{commit.commitHash.substring(0, 7)}</div>
              <div>{commit.score.toFixed(2)}</div>
              <div className="text-xs">
                <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded-full mr-1">
                  Eval: {commit.metrics.evalCount}
                </span>
                <span className="inline-block px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                  Short Vars: {commit.metrics.shortVarCount}
                </span>
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCommitSelect(commit)}
                >
                  {selectedCommit === commit ? 'Hide' : 'Details'}
                </Button>
              </div>

              {selectedCommit === commit && (
                <div className="col-span-5 bg-card p-4 rounded-md mt-2 border border-border/50 shadow-lg">
                  <h4 className="font-medium mb-2 text-gradient inline-block">Commit Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Commit Hash</p>
                      <p className="font-mono">{commit.commitHash}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p>{formatDate(commit.timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Obfuscation Score</p>
                      <p>{commit.score.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Minified</p>
                      <p>{commit.metrics.isMinified ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Eval Count</p>
                      <p>{commit.metrics.evalCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Short Variable Count</p>
                      <p>{commit.metrics.shortVarCount}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommitDetails;
