import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  errorMessage: string | null;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    errorMessage: null
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      errorMessage: error instanceof Error ? error.stack ?? error.message : String(error)
    };
  }

  componentDidCatch(error: unknown) {
    console.error("Renderer Boot Error", error);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div style={styles.card}>
          <div style={styles.title}>Renderer Boot Error</div>
          <div style={styles.body}>{this.state.errorMessage}</div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  card: {
    margin: "16px",
    padding: "14px",
    borderRadius: "18px",
    background: "rgba(127, 29, 29, 0.9)",
    color: "#fff7f7",
    font: "12px/1.5 Menlo, Monaco, monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word"
  } as const,
  title: {
    fontWeight: 800,
    marginBottom: "8px"
  } as const,
  body: {} as const
};

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  const root = document.getElementById("root");
  if (root) {
    root.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
  }
}
