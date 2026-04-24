import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: string | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(err: any): State {
    return { error: String(err?.message ?? err ?? "Unknown error") };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: "#000", color: "#F7931A", fontFamily: "monospace",
          padding: "24px", minHeight: "100vh", whiteSpace: "pre-wrap",
          wordBreak: "break-all"
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "16px" }}>⚡ VBC ERROR</div>
          <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "12px" }}>
            {this.state.error}
          </div>
          <div style={{ color: "#555", fontSize: "10px" }}>
            Copy this error and send to developer
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px", background: "#F7931A", color: "#000",
              border: "none", padding: "10px 24px", fontFamily: "monospace",
              fontWeight: "bold", cursor: "pointer", display: "block"
            }}>
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
