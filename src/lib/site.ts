export const site = {
  name: 'Pavan Yadava Annappa',
  role: 'ML Engineer - 3D Perception, Sensor Fusion & Edge Deployment',
  title: 'Pavan Yadava Annappa - ML Engineer, 3D Perception & Edge Deployment',
  description:
    'ML engineer building 3D perception and sensor fusion, then shipping it to hardware: TensorRT, ONNX, ROS 2, Rust. Every number measured on stated hardware.',
  url: 'https://pavanyadava007.github.io',
  location: 'Nürnberg, Germany',
  availability: 'available from 20 Oct 2026',
  email: 'pavanyadava07@gmail.com',
  cv: '/cv.pdf',
  social: {
    github: 'https://github.com/pavanyadava007',
    linkedin: 'https://www.linkedin.com/in/pavan-yadav-annappa',
    huggingface: 'https://huggingface.co/pavanyadava07',
  },
  knowsAbout: [
    'BEV perception',
    'Sensor fusion',
    'LiDAR',
    '3D object detection',
    'TensorRT',
    'ONNX Runtime',
    'ROS 2',
    'Model quantization',
    'Edge deployment',
    'ISO 26262',
    'ISO 21448 (SOTIF)',
    'Vision-language models',
    'Retrieval-augmented generation',
  ],
  nav: [
    { href: '/work', label: 'Work' },
    { href: '/lab', label: 'Lab' },
    { href: '/about', label: 'About' },
  ],
  footerNote:
    'All benchmarks on this site were measured on the hardware named beside them (NVIDIA L4 and AMD EPYC 7R13 on an AWS EC2 host). Nothing is extrapolated to hardware I did not run on, and the failed or inconclusive experiments are documented in each repository alongside the successful ones.',
} as const;

export const CATEGORY_LABELS = {
  perception: 'Perception',
  'edge-mlops': 'Edge / MLOps',
  robotics: 'Robotics',
  'llm-rag': 'LLM / RAG',
  signals: 'Signals',
  hardware: 'Hardware',
} as const;

export const STATUS_LABELS = {
  live: 'Live demo',
  new: 'New',
  private: 'Private',
  'design-study': 'Design study',
  'pipeline-only': 'Pipeline only',
} as const;

export const LIMIT_LABELS = {
  failed: 'Failed / did not help',
  'not-measured': 'Not measured',
  'small-n': 'Small n',
  'sim-only': 'Simulation only',
  other: 'Caveat',
} as const;
