# CI Performance Gates Checklist

**Purpose:** Automated enforcement of performance budgets in CI/CD pipeline.

---

## 1. Overview

All PRs must pass the following performance gates before merge. These gates enforce the budgets defined in `performance-budget.md`.

---

## 2. Bundle Size Gate

### 2.1 Configuration

```yaml
# .github/workflows/bundle-check.yml
name: Bundle Size Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  bundle-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - name: Check Bundle Sizes
        run: |
          # Core bundle check
          CORE_SIZE=$(stat --printf="%s" .next/static/chunks/main-*.js | head -1)
          CORE_SIZE_KB=$((CORE_SIZE / 1024))
          
          if [ $CORE_SIZE_KB -gt 350 ]; then
            echo "❌ Core bundle exceeds 350KB limit: ${CORE_SIZE_KB}KB"
            exit 1
          fi
          echo "✅ Core bundle: ${CORE_SIZE_KB}KB"
```

### 2.2 Budget Thresholds

| Asset | Warning | Fail |
|-------|---------|------|
| Core JS bundle | > 300 KB | > 350 KB |
| Three.js chunk | > 400 KB | > 450 KB |
| Total page transfer | > 1.5 MB | > 2.0 MB |
| Any single chunk | > 200 KB | > 300 KB |

### 2.3 Required Actions on Failure

1. Analyze bundle with `npm run analyze`
2. Check for unintentional imports
3. Verify tree-shaking is working
4. Consider code splitting

---

## 3. Cold-Start Transfer Snapshot

### 3.1 Configuration

```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      http://localhost:3000/tools/calculator
      http://localhost:3000/tools/torsional-audit
    budgetPath: ./lighthouse-budget.json
    uploadArtifacts: true
```

### 3.2 Lighthouse Budget File

```json
// lighthouse-budget.json
[
  {
    "matchingUrlPattern": ".*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 500 },
      { "resourceType": "total", "budget": 2000 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 10 }
    ]
  }
]
```

### 3.3 Required Metrics

| Metric | Target | Fail |
|--------|--------|------|
| Total Blocking Time | < 200 ms | > 500 ms |
| Largest Contentful Paint | < 2.5 s | > 4.0 s |
| First Input Delay | < 100 ms | > 300 ms |
| Cumulative Layout Shift | < 0.1 | > 0.25 |

---

## 4. Animation Performance Regression Test

### 4.1 Test Structure

```typescript
// tests/performance/animation.perf.test.ts
import { measureFrameRate } from '@/test-utils/perf';

describe('Animation Performance', () => {
  it('maintains 50+ FPS during continuous play (30s)', async () => {
    const metrics = await measureFrameRate({
      component: 'VariablePitchCompressionSpringVisualizer',
      duration: 30000,
      action: 'continuous-play'
    });
    
    expect(metrics.avgFps).toBeGreaterThanOrEqual(50);
    expect(metrics.minFps).toBeGreaterThanOrEqual(30);
    expect(metrics.fpsVariance).toBeLessThan(10);
  });
  
  it('slider interaction latency < 50ms (p95)', async () => {
    const metrics = await measureInteractionLatency({
      component: 'Calculator3DPreview',
      action: 'slider-drag',
      samples: 100
    });
    
    expect(metrics.p95).toBeLessThan(50);
  });
});
```

### 4.2 Performance Metrics Collection

```typescript
// test-utils/perf.ts
export interface FrameRateMetrics {
  avgFps: number;
  minFps: number;
  maxFps: number;
  fpsVariance: number;
  frameDrops: number;
}

export interface InteractionMetrics {
  p50: number;
  p95: number;
  p99: number;
  max: number;
}
```

### 4.3 CI Integration

```yaml
- name: Performance Regression Tests
  run: |
    npm run test:perf
  env:
    PERF_THRESHOLD_FPS: 50
    PERF_THRESHOLD_LATENCY_MS: 50
```

---

## 5. Memory Leak Detection

### 5.1 Configuration

```typescript
// tests/performance/memory.perf.test.ts
describe('Memory Stability', () => {
  it('no heap growth after repeated mount/unmount', async () => {
    const initialHeap = await getHeapUsage();
    
    for (let i = 0; i < 10; i++) {
      await mountComponent('CompressionSpringVisualizer');
      await unmountComponent();
    }
    
    await forceGC();
    const finalHeap = await getHeapUsage();
    
    const growth = finalHeap - initialHeap;
    expect(growth).toBeLessThan(5 * 1024 * 1024); // < 5MB
  });
});
```

---

## 6. Geometry Budget Check

### 6.1 Static Analysis

```typescript
// scripts/check-geometry-budget.ts
const VERTEX_BUDGET = 120_000;
const BUFFER_SIZE_BUDGET = 8 * 1024 * 1024; // 8MB

// Check default geometry configurations
for (const springType of SPRING_TYPES) {
  const config = getDefaultConfig(springType);
  const geometry = createGeometry(config);
  
  if (geometry.attributes.position.count > VERTEX_BUDGET) {
    throw new Error(`${springType} exceeds vertex budget`);
  }
}
```

---

## 7. CI Gate Summary

### 7.1 Required Gates (Block on Failure)

| Gate | Threshold | Action on Fail |
|------|-----------|----------------|
| Bundle Size | > 350 KB core | Block merge |
| Page Transfer | > 2 MB | Block merge |
| Animation FPS | < 50 avg | Block merge |
| Interaction Latency | > 50 ms p95 | Block merge |

### 7.2 Warning Gates (Annotate but Allow)

| Gate | Threshold | Action on Warning |
|------|-----------|-------------------|
| Bundle Size | > 300 KB core | Add PR comment |
| Memory Growth | > 5 MB after cycles | Add PR comment |
| Geometry Vertices | > 60k | Add PR comment |

---

## 8. PR Comment Template

```markdown
## 🎯 Performance Check Results

| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| Core Bundle | 285 KB | 350 KB | ✅ |
| Page Transfer | 1.4 MB | 2.0 MB | ✅ |
| Animation FPS | 58 avg | ≥ 50 | ✅ |
| Interaction p95 | 32 ms | ≤ 50 ms | ✅ |

<details>
<summary>View detailed breakdown</summary>

[Bundle analysis report]
[Lighthouse report]
[Animation test logs]

</details>
```

---

## 9. Implementation Checklist

- [ ] Add `bundle-check.yml` to `.github/workflows/`
- [ ] Add `lighthouse-budget.json` to project root
- [ ] Create `tests/performance/` directory
- [ ] Implement `measureFrameRate` utility
- [ ] Implement `measureInteractionLatency` utility
- [ ] Add `npm run test:perf` script
- [ ] Configure PR status checks in GitHub
- [ ] Set up performance artifact storage

---

> **All gates are mandatory for production deployments.**
