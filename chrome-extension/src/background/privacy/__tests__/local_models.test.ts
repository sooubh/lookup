import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WebGpuRuntime,
  WasmFallback,
  LocalVisionEngine,
  HeuristicVisionProvider,
  WebGpuVisionProvider,
  WasmVisionProvider,
  LocalSemanticEngine,
  HeuristicSemanticProvider,
  ChromeBuiltinAiSemanticProvider,
  WebGpuSemanticProvider,
  WasmSemanticProvider,
  SemanticDetector,
  EvidenceFusion,
  SensitiveDetector,
  PrivacyPipeline,
} from '../index';

describe('Local In-Browser Models & Perception Providers (Tasks 10 & 11)', () => {
  describe('Hardware Runtimes (WebGPU & WASM)', () => {
    beforeEach(() => {
      WebGpuRuntime.resetCache();
    });

    it('WebGpuRuntime safely reports availability in non-GPU environment', async () => {
      const isAvailable = await WebGpuRuntime.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
      const device = await WebGpuRuntime.requestDevice();
      if (!isAvailable) {
        expect(device).toBeNull();
      }
    });

    it('WasmFallback validates WebAssembly execution and executes successfully', async () => {
      const isWasmAvailable = WasmFallback.isAvailable();
      expect(typeof isWasmAvailable).toBe('boolean');
      expect(isWasmAvailable).toBe(true); // Node / Vitest has WebAssembly

      const result = await WasmFallback.execute(async () => 42 * 2);
      expect(result).toBe(84);
    });
  });

  describe('LocalSemanticEngine & Semantic PII Classifiers', () => {
    let heuristicProvider: HeuristicSemanticProvider;

    beforeEach(() => {
      heuristicProvider = new HeuristicSemanticProvider();
    });

    it('HeuristicSemanticProvider detects person names in conversational intros', async () => {
      const text = 'Hello, my name is Jonathan Archer and I am reporting this issue.';
      const findings = await heuristicProvider.analyzeText(text);

      const nameFinding = findings.find(f => f.category === 'PERSONAL_IDENTITY');
      expect(nameFinding).toBeDefined();
      expect(nameFinding?.text).toBe('Jonathan Archer');
      expect(nameFinding?.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('HeuristicSemanticProvider detects logged-in account holder names', async () => {
      const text = 'Logged in as: Sarah Connor on dashboard.';
      const findings = await heuristicProvider.analyzeText(text);

      const nameFinding = findings.find(f => f.category === 'PERSONAL_IDENTITY');
      expect(nameFinding).toBeDefined();
      expect(nameFinding?.text).toBe('Sarah Connor');
    });

    it('HeuristicSemanticProvider detects health and medical data', async () => {
      const text = 'Patient ID: MRN-884920. Diagnosed with chronic hypertension.';
      const findings = await heuristicProvider.analyzeText(text);

      const mrnFinding = findings.find(f => f.label === 'Medical Record Identifier');
      expect(mrnFinding).toBeDefined();
      expect(mrnFinding?.category).toBe('HEALTH');

      const conditionFinding = findings.find(f => f.label === 'Health / Medical Condition');
      expect(conditionFinding).toBeDefined();
      expect(conditionFinding?.category).toBe('HEALTH');
    });

    it('HeuristicSemanticProvider detects enterprise confidential marks', async () => {
      const text = 'STRICTLY CONFIDENTIAL: internal roadmap for Q4.';
      const findings = await heuristicProvider.analyzeText(text);

      const confFinding = findings.find(f => f.category === 'BUSINESS_CONFIDENTIAL');
      expect(confFinding).toBeDefined();
      expect(confFinding?.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('HeuristicSemanticProvider detects private messages', async () => {
      const text = 'Private message: Can we discuss the contract privately tomorrow?';
      const findings = await heuristicProvider.analyzeText(text);

      const msgFinding = findings.find(f => f.category === 'PRIVATE_MESSAGE');
      expect(msgFinding).toBeDefined();
      expect(msgFinding?.category).toBe('PRIVATE_MESSAGE');
    });

    it('ChromeBuiltinAiSemanticProvider gracefully handles missing window.ai', async () => {
      const provider = new ChromeBuiltinAiSemanticProvider();
      const available = await provider.isAvailable();
      expect(available).toBe(false);

      const findings = await provider.analyzeText('Some confidential text');
      expect(findings).toEqual([]);
    });

    it('ChromeBuiltinAiSemanticProvider uses Gemini Nano when window.ai is present', async () => {
      const mockSession = {
        prompt: vi.fn().mockResolvedValue(
          JSON.stringify([
            {
              text: 'Dr. John Watson',
              category: 'PERSONAL_IDENTITY',
              confidence: 0.95,
              label: 'Physician Name',
            },
          ]),
        ),
        destroy: vi.fn(),
      };

      (globalThis as any).ai = {
        languageModel: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn().mockResolvedValue(mockSession),
        },
      };

      const provider = new ChromeBuiltinAiSemanticProvider();
      expect(await provider.isAvailable()).toBe(true);

      const findings = await provider.analyzeText('Dr. John Watson consulted the patient.');
      expect(findings.length).toBe(1);
      expect(findings[0].text).toBe('Dr. John Watson');
      expect(findings[0].category).toBe('PERSONAL_IDENTITY');
      expect(mockSession.destroy).toHaveBeenCalled();

      // Clean up mock
      delete (globalThis as any).ai;
    });

    it('LocalSemanticEngine cascades across providers and supports custom hooks', async () => {
      const customHook = vi.fn().mockResolvedValue([
        {
          category: 'BUSINESS_CONFIDENTIAL',
          confidence: 0.96,
          text: 'Project Titan',
          label: 'Secret Code Name',
        },
      ]);

      const engine = new LocalSemanticEngine([new WebGpuSemanticProvider(customHook), new HeuristicSemanticProvider()]);

      // If WebGPU is not available in Node, it cascades to Heuristic provider
      const findings = await engine.analyzeText('Hello, my name is Arthur Dent');
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].category).toBe('PERSONAL_IDENTITY');
    });
  });

  describe('LocalVisionEngine & Visual PII Providers', () => {
    let visionEngine: LocalVisionEngine;

    beforeEach(() => {
      visionEngine = new LocalVisionEngine();
    });

    it('HeuristicVisionProvider detects government ID and passport regions in image URLs', async () => {
      const findings = await visionEngine.analyze('data:image/png;base64,sample_passport_scan_data');
      expect(findings.length).toBe(1);
      expect(findings[0].category).toBe('GOVERNMENT_DOCUMENT');
      expect(findings[0].label).toContain('Government ID');
      expect(visionEngine.getLastUsedProviderName()).toBe('HeuristicVisionProvider');
    });

    it('HeuristicVisionProvider detects credit card shapes in image URLs', async () => {
      const findings = await visionEngine.analyze('data:image/png;base64,payment_card_front_preview');
      expect(findings.length).toBe(1);
      expect(findings[0].category).toBe('PAYMENT');
      expect(findings[0].label).toContain('Card Shape');
    });

    it('HeuristicVisionProvider detects face regions in image URLs', async () => {
      const findings = await visionEngine.analyze('data:image/png;base64,user_face_portrait');
      expect(findings.length).toBe(1);
      expect(findings[0].category).toBe('FACE');
      expect(findings[0].label).toContain('Human Face');
    });

    it('LocalVisionEngine supports custom provider and registers last used provider', async () => {
      const mockCustomProvider = {
        name: 'MockCustomVisionProvider',
        isAvailable: vi.fn().mockResolvedValue(true),
        analyze: vi.fn().mockResolvedValue([
          {
            category: 'LOCATION',
            bbox: { x: 0, y: 0, width: 100, height: 100 },
            confidence: 0.99,
            label: 'GPS Map Region',
          },
        ]),
      };

      const customEngine = new LocalVisionEngine([mockCustomProvider]);
      const results = await customEngine.analyze('data:image/png;base64,map_screen');
      expect(results.length).toBe(1);
      expect(results[0].category).toBe('LOCATION');
      expect(customEngine.getLastUsedProviderName()).toBe('MockCustomVisionProvider');
    });
  });

  describe('Multi-Signal Evidence Fusion with Model Source', () => {
    it('SemanticDetector converts SemanticFindings into standard Evidence with source=model', () => {
      const detector = new SemanticDetector();
      const evidence = detector.detect([
        {
          category: 'PERSONAL_IDENTITY',
          confidence: 0.91,
          text: 'Jane Doe',
          label: 'Customer Name',
          startIndex: 10,
          endIndex: 18,
        },
      ]);

      expect(evidence.length).toBe(1);
      expect(evidence[0].source).toBe('model');
      expect(evidence[0].category).toBe('PERSONAL_IDENTITY');
      expect(evidence[0].confidence).toBe(0.91);
      expect(evidence[0].text).toBe('Jane Doe');
    });

    it('EvidenceFusion grants cross-signal confirmation bonus when pattern and model agree', () => {
      const fusion = new EvidenceFusion();
      const fused = fusion.fuse([
        {
          id: 'pattern-1',
          source: 'pattern',
          category: 'PAYMENT',
          confidence: 0.75,
          text: '4532 0151 1283 0366',
        },
        {
          id: 'model-1',
          source: 'model',
          category: 'PAYMENT',
          confidence: 0.85,
          text: '4532 0151 1283 0366',
        },
      ]);

      expect(fused.length).toBe(1);
      expect(fused[0].sources).toContain('pattern');
      expect(fused[0].sources).toContain('model');
      // Cross-signal confirmation bonus should elevate confidence
      expect(fused[0].confidence).toBeGreaterThanOrEqual(0.95);
      expect(fused[0].severity).toBe('critical');
    });
  });

  describe('Fail-Closed & Invariant Verification (Rule E & Rule H)', () => {
    it('Model failure does not crash pipeline and fails gracefully to safe policy', async () => {
      // Create a faulty provider that throws an error
      const faultySemanticProvider = {
        name: 'FaultySemanticProvider',
        isAvailable: vi.fn().mockResolvedValue(true),
        analyzeText: vi.fn().mockRejectedValue(new Error('GPU Out of Memory Crash')),
      };

      const engine = new LocalSemanticEngine([faultySemanticProvider, new HeuristicSemanticProvider()]);

      // Should not throw, but fall through to Heuristic provider
      const findings = await engine.analyzeText('My name is Bruce Wayne');
      expect(findings.length).toBe(1);
      expect(findings[0].text).toBe('Bruce Wayne');
    });

    it('End-to-End PrivacyPipeline detects and redacts contextual name and confidential info', async () => {
      const pipeline = new PrivacyPipeline();

      const rawContext = {
        task: 'Help user fill out application form',
        step: 1,
        pageUrl: 'https://example.com/apply',
        pageTitle: 'Apply Now',
        dom: [
          {
            selector: '#user-intro',
            tag: 'p',
            text: 'Welcome back, my name is Eleanor Vance. Account status active.',
            attributes: { id: 'user-intro' },
          },
          {
            selector: '#classified-note',
            tag: 'div',
            text: 'STRICTLY CONFIDENTIAL: Do not reveal trade secrets.',
            attributes: { id: 'classified-note' },
          },
        ],
      };

      const result = await pipeline.process(rawContext, {
        strictness: 'balanced',
        redactionMethod: 'token',
      });

      expect(result.privacy.status).toBe('approved');
      expect(result.redactions.length).toBeGreaterThanOrEqual(1);

      // Verify that DOM or text was sanitized
      const sanitizedIntro = result.dom?.elements.find(d => d.selector === '#user-intro');
      expect(sanitizedIntro?.text).not.toContain('Eleanor Vance');
      expect(sanitizedIntro?.text).toContain('[PERSONAL_IDENTITY_');

      const sanitizedConf = result.dom?.elements.find(d => d.selector === '#classified-note');
      expect(sanitizedConf?.text).not.toContain('STRICTLY CONFIDENTIAL');
      expect(sanitizedConf?.text).toContain('[BUSINESS_CONFIDENTIAL_');
    });
  });
});
