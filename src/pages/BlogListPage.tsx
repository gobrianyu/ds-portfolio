import { motion } from 'motion/react';
import { Terminal, BookOpen } from 'lucide-react';
import { blogPosts } from '../data/blogs';
import BlogCard from '../components/BlogCard';

export default function BlogListPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-20"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="px-3 py-1 bg-violet-500/10 rounded-md border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
            <Terminal className="w-3 h-3" />
            <span>ls ./research</span>
          </div>
          <div className="px-3 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
            Status: Indexed
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-8 text-foreground tracking-tighter">
          Paper <span className="text-violet-400">Reviews</span>
        </h1>
        
        <div className="terminal-window p-8 bg-muted/40 border-violet-500/20 max-w-3xl">
          <p className="text-lg text-muted-foreground leading-relaxed font-medium">
            <span className="text-violet-400 font-mono mr-2">{" >>> "}</span>
            Critical reviews and architectural breakdowns of industry-defining research papers 
            in the field of distributed systems.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {blogPosts.map((post, i) => (
          <BlogCard 
            key={post.id} 
            post={post} 
            index={i} 
          />
        ))}
      </div>
    </div>
  );
}
