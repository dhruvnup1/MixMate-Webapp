import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Something went wrong." };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="page">
          <div className="container" style={{ maxWidth: 480, margin: "60px auto", padding: "0 16px", textAlign: "center" }}>
            <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
            <p className="muted" style={{ marginBottom: 24 }}>{this.state.message}</p>
            <button
              className="btn primary"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              Try again
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
