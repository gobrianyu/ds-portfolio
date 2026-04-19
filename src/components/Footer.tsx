import React, { useState, useEffect } from 'react';
import { Github, Linkedin, Mail, Cloud, Sun, CloudRain, MapPin, Cpu, CloudSun, CloudFog, CloudDrizzle, Snowflake, CloudLightning } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [hash, setHash] = useState('');
  const [weather, setWeather] = useState<{ tempC: number; tempF: number; condition: string; code: number } | null>(null);
  const [seattleTime, setSeattleTime] = useState('');

  // Simulated Bitcoin Hasher
  useEffect(() => {
    const interval = setInterval(() => {
      const chars = '0123456789abcdef';
      let result = '';
      for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setHash(result);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Seattle Time & Weather
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      setSeattleTime(new Intl.DateTimeFormat('en-US', options).format(new Date()));
    };

    updateTime();
    const timerInterval = setInterval(updateTime, 60000);

    // Fetch real Seattle weather (no key required)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=47.6062&longitude=-122.3321&current_weather=true')
      .then(res => res.json())
      .then(data => {
        const tempC = Math.round(data.current_weather.temperature);
        const tempF = Math.round((tempC * 9/5) + 32);
        const code = data.current_weather.weathercode;
        
        // WMO Weather interpretation codes (WW)
        let condition = 'Clear';
        if (code === 0) condition = 'Clear sky';
        else if (code >= 1 && code <= 3) condition = 'Partly cloudy';
        else if (code === 45 || code === 48) condition = 'Foggy';
        else if (code >= 51 && code <= 57) condition = 'Drizzling';
        else if (code >= 61 && code <= 67) condition = 'Rainy';
        else if (code >= 71 && code <= 77) condition = 'Snowy';
        else if (code >= 80 && code <= 82) condition = 'Showers';
        else if (code >= 85 && code <= 86) condition = 'Snow showers';
        else if (code >= 95) condition = 'Thunderstorm';
        
        setWeather({ tempC, tempF, condition, code });
      })
      .catch(() => setWeather({ tempC: 11, tempF: 52, condition: 'Clear', code: 0 }));

    return () => clearInterval(timerInterval);
  }, []);

  const getWeatherIcon = () => {
    if (!weather) return <Sun className="w-4 h-4" />;
    const code = weather.code;
    
    if (code === 0) return <Sun className="w-4 h-4" />;
    if (code >= 1 && code <= 2) return <CloudSun className="w-4 h-4" />;
    if (code === 3) return <Cloud className="w-4 h-4" />;
    if (code === 45 || code === 48) return <CloudFog className="w-4 h-4" />;
    if (code >= 51 && code <= 57) return <CloudDrizzle className="w-4 h-4" />;
    if (code >= 61 && code <= 67 || code >= 80 && code <= 82) return <CloudRain className="w-4 h-4" />;
    if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return <Snowflake className="w-4 h-4" />;
    if (code >= 95) return <CloudLightning className="w-4 h-4" />;
    
    return <Sun className="w-4 h-4" />;
  };

  return (
    <footer className="py-20 bg-background border-t border-border/40 relative overflow-hidden transition-colors">
      {/* Soft warm glow */}
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
          {/* Status & Location Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-muted-foreground/70">
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary/60" />
                <span className="text-xs font-bold uppercase tracking-widest">Seattle, WA</span>
              </div>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-xs font-mono font-medium">{seattleTime}</span>
            </div>
            
            <div className="flex items-start md:items-center space-x-4 group">
              <div className="mt-1 md:mt-0 p-2.5 bg-muted/50 rounded-xl group-hover:bg-primary/5 transition-colors">
                {getWeatherIcon()}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                Thinking and building in {weather ? `${weather.tempC}°C/${weather.tempF}°F` : '--°C/--°F'}, {weather?.condition.toLowerCase() ?? 'weather'}. 
                Designing from a cozy corner in the Pacific Northwest.
              </p>
            </div>
          </div>

          {/* Social Connect Section */}
          <div className="flex flex-col items-start md:items-end gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">Connect with me</span>
            <div className="flex items-center -mr-2">
              {[
                { icon: Github, href: "https://github.com/gobrianyu", label: "GitHub" },
                { icon: Linkedin, href: "https://www.linkedin.com/in/gobrianyu/", label: "LinkedIn" },
                { icon: Mail, href: "mailto:gobrianyu@gmail.com", label: "Email" }
              ].map((link, i) => (
                <a 
                  key={i}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 text-muted-foreground hover:text-primary transition-all group"
                  aria-label={link.label}
                >
                  <link.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom: Hasher & Metadata */}
        <div className="pt-10 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-3 px-4 py-1.5 bg-muted/30 rounded-full border border-border/50 backdrop-blur-sm">
               <Cpu className="w-3 h-3 text-primary animate-pulse" />
               <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[140px] md:max-w-[240px]">
                 {hash}...
               </span>
             </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              © {new Date().getFullYear()} Brian S. Yu
            </p>
            <p className="text-[10px] font-medium text-muted-foreground/40 italic">
              "Stay curious, keep buildin'."
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
