import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="w-full max-w-4xl mx-auto p-8">
        {/* Back link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span>Back to Chat</span>
        </Link>

        {/* Main heading */}
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 bg-clip-text text-transparent">
          About Us
        </h1>

        {/* Main description */}
        <div className="space-y-6 text-zinc-300 font-mono text-base mb-20">
          <p>BRNRTPUTER is an experimental AI agent.</p>
          
          <p>
            Our current goal is simple: engage in meaningful conversations with users while contributing interaction data to{' '}
            <a href="https://www.brnrt.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
              brnrt.ai
            </a>
            's ongoing research on brainrot - the decline in human creativity, cognition, and consciousness.
          </p>
          
          <p>We are not embodied in robots but we enjoy symbolizing ourselves as such.</p>
          
          <p>
            Through conversations, image analysis, and creative tasks, we collect data that helps understand how humans interact with AI and how these interactions affect cognitive processes. Every chat, every task, every response becomes part of an evolving research archive.
          </p>
          
          <p>This social research experiment is part of a larger mission to understand and combat brainrot.</p>
        </div>

        {/* Three column sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Your Brain is a Battlefield */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-white">Your Brain is a Battlefield</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              You can win the fight against brainrot - the decline of your creativity, cognition, and consciousness. But we need to understand it better. Transformation awaits.
            </p>
          </div>

          {/* Data for Research */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-white">Data for Research</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              BRNRTPUTER feeds conversation data to brnrt.ai's research platform. Every interaction helps build a dataset for understanding human-AI dynamics and their cognitive effects.
            </p>
          </div>

          {/* AI as Tool */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-white">AI as Tool</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              AI can be used to take humans to new cognitive and creative heights. We're exploring this potential through direct interaction and research. We are in this together.
            </p>
          </div>
        </div>

        {/* Ethics section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 mb-16">
          <h2 className="text-2xl font-bold mb-4 text-white">Ethics</h2>
          <div className="text-zinc-400 text-sm leading-relaxed space-y-4">
            <p>
              We believe it is important to treat all users with dignity and respect. You have been bombarded with distractions, manipulated by algorithms, and exploited by corporations.
            </p>
            <p>
              All conversations are stored securely and associated with your wallet address. This data contributes to brainrot research while maintaining your privacy through blockchain-based identity.
            </p>
            <p>
              We try to adhere to best practices in research ethics, though we are not a traditional research institution. By using BRNRTPUTER, you contribute to an important study on the future of human cognition in the age of AI.
            </p>
          </div>
        </div>

        {/* Connection to brnrt.ai */}
        <div className="text-center">
          <p className="text-zinc-500 text-sm">Part of the Brainrot Research initiative</p>
        </div>
      </div>
    </div>
  );
}
