import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Quote, BookOpen, FileText, Terminal, FileCode, Cpu } from 'lucide-react';
import { blogPosts } from '../data/blogs';
import AISummary from '../components/AISummary';

export default function BlogPage() {
  const { id } = useParams();
  const post = blogPosts.find(p => p.id === id);

  if (!post) return <Navigate to="/blog" />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <Link
        to="/blog"
        className="inline-flex items-center text-gray-500 hover:text-primary mb-12 transition-colors font-bold uppercase tracking-widest text-[10px] group"
      >
        <ArrowLeft className="mr-2 w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
        <span>cd ..</span>
      </Link>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <header className="mb-16">
          <div className="flex items-center space-x-3 mb-6">
            <div className="px-3 py-1 bg-violet-500/10 rounded-md border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
              <Terminal className="w-3 h-3" />
              <span>Log: {post.id}</span>
            </div>
            <div className="px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
              Status: Analyzed
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-10 leading-[0.9] text-white tracking-tighter">
            {post.title}
          </h1>
          
          <div className="terminal-window p-8 bg-violet-950/10 border-violet-500/20 flex items-start space-x-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/50 to-transparent" />
            <div className="p-3 bg-violet-500/10 rounded-xl">
              <Quote className="w-8 h-8 text-violet-400 shrink-0" />
            </div>
            <div>
              <p className="text-[10px] font-black text-violet-400 mb-2 uppercase tracking-widest opacity-50">Citation</p>
              <p className="text-gray-400 italic text-lg font-medium leading-relaxed">{post.citation}</p>
            </div>
          </div>
        </header>

        <div className="terminal-window mb-16 border-white/5 overflow-hidden">
          <div className="terminal-header bg-white/5">
            <div className="flex items-center space-x-2">
              <Cpu className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI_SUMMARY.bin</span>
            </div>
          </div>
          <div className="p-8">
            <AISummary summary={post.aiSummary} />
          </div>
        </div>

        <div className="prose prose-invert max-w-none mt-20">
          <div className="flex items-center space-x-4 mb-10">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-3xl font-black m-0 text-white tracking-tight uppercase tracking-widest">Analysis & Discussion</h2>
          </div>
          
          <div className="text-gray-400 leading-relaxed text-xl space-y-8 font-medium">
            {post.content.split('\n').map((paragraph, i) => (
              <p key={i} className="relative pl-6">
                <span className="absolute left-0 top-0 text-primary/30 font-mono text-sm">{String(i + 1).padStart(2, '0')}</span>
                {paragraph}
              </p>
            ))}
            
            <p className="text-gray-500 italic mt-16 border-t border-white/5 pt-10 text-lg">
              This analysis explores the trade-offs between consistency, availability, and partition tolerance 
              as presented in the original research. The architectural patterns discussed here continue to 
              influence modern cloud infrastructure.
            </p>
          </div>
        </div>

        <div className="mt-20 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Written by</p>
              <p className="font-black text-xl text-white tracking-tight">Brian S. Yu</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase tracking-widest border border-primary/20">Research</span>
            <span className="px-4 py-2 bg-violet-500/10 text-violet-400 rounded-md text-[10px] font-black uppercase tracking-widest border border-violet-500/20">Distributed Systems</span>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
