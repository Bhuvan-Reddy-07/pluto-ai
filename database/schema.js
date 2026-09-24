/**
 * PlutoAI - Database Schema & Data Models
 * Defines the schemas for persistent storage in IndexedDB & Chrome Storage.
 */

export const PlutoDBSchema = {
  version: 1,
  name: 'PlutoAIDB',
  stores: {
    // 1. Session Store: Active & Historical Agent Runs
    sessions: {
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'status', keyPath: 'status' },
        { name: 'provider', keyPath: 'provider' }
      ]
    },

    // 2. Action Logs: Stepwise UI Executions with Grounding Coordinates
    actions: {
      keyPath: 'actionId',
      autoIncrement: true,
      indexes: [
        { name: 'sessionId', keyPath: 'sessionId' },
        { name: 'type', keyPath: 'type' },
        { name: 'tagNumber', keyPath: 'tagNumber' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    },

    // 3. Privacy & Redaction Audit: Zero-Raw-PII Compliance Records
    auditLogs: {
      keyPath: 'auditId',
      autoIncrement: true,
      indexes: [
        { name: 'sessionId', keyPath: 'sessionId' },
        { name: 'piiTypes', keyPath: 'piiTypes', multiEntry: true },
        { name: 'redactionMode', keyPath: 'redactionMode' },
        { name: 'zeroRawPII', keyPath: 'zeroRawPII' },
        { name: 'signature', keyPath: 'signature' }
      ]
    },

    // 4. Performance & Telemetry: Latency, Tokens & Perception Timers
    metrics: {
      keyPath: 'metricId',
      autoIncrement: true,
      indexes: [
        { name: 'sessionId', keyPath: 'sessionId' },
        { name: 'perceptionLatency', keyPath: 'perceptionLatency' },
        { name: 'inferenceLatency', keyPath: 'inferenceLatency' },
        { name: 'totalLatency', keyPath: 'totalLatency' }
      ]
    }
  }
};
