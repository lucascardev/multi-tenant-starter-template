
import { stackServerApp } from "@/stack";

export default async function DebugStack() {
  return (
    <pre>
      {JSON.stringify(stackServerApp.urls, null, 2)}
    </pre>
  );
}
