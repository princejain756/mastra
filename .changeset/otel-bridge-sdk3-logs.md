---
'@mastra/otel-bridge': patch
---

Fixed `OtelBridge` dropping Mastra logs in apps running on OpenTelemetry JS SDK 3 (`@opentelemetry/api` >= 1.10), where the global `LoggerProvider` is registered on `logs` from `@opentelemetry/api` rather than `@opentelemetry/api-logs`. `OtelBridge` now checks `@opentelemetry/api` for a configured `LoggerProvider` first and falls back to `@opentelemetry/api-logs`, and re-resolves the global provider on `onLogEvent` and `flush` if it was registered after the bridge was constructed.
