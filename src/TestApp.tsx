import React from 'react';

const TestApp = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Test App</h1>
        <p className="text-lg">If you can see this, React is working!</p>
        <div className="text-sm text-muted-foreground">
          Time: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default TestApp;