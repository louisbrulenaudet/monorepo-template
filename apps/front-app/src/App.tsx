// src/App.tsx

import { lazy, Suspense } from "react";
import "./App.css";

const HomePage = lazy(() =>
  import("./routes/HomePage").then((m) => ({ default: m.HomePage })),
);

function App() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <HomePage />
    </Suspense>
  );
}

export default App;
