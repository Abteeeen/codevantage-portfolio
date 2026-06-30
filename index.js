/* ============================================================
   CODEVANTAGE.IO — JavaScript Interactions
   - Smooth scroll navigation
   - Intersection Observer scroll-reveal
   - Animated number counters
   - Mobile nav toggle
   - Navbar scroll behavior
   ============================================================ */

(function () {
  'use strict';

  // ── Kinetic Typography & Scroll-Linked 3D ──
  const kineticHeadings = document.querySelectorAll('.sh__title, .hero__title');
  const heroCanvas = document.getElementById('heroCanvas');
  let tickingScroll = false;

  window.addEventListener('scroll', function() {
    if (!tickingScroll) {
      window.requestAnimationFrame(function() {
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        
        // 1. Kinetic Typography
        kineticHeadings.forEach(h => {
          const rect = h.getBoundingClientRect();
          const scrollPercent = 1 - (rect.top / viewportHeight);
          let weight = 200 + (scrollPercent * 700);
          weight = Math.max(200, Math.min(900, weight));
          h.style.fontVariationSettings = `"wght" ${weight}`;
        });
        
        // 2. Scroll-Linked 3D Canvas
        if (heroCanvas) {
          const scrollRatio = Math.min(1, scrollY / viewportHeight);
          const scale = 1 - (scrollRatio * 0.4); // Zoom out slightly
          heroCanvas.style.opacity = Math.max(0, 0.6 - scrollRatio); // Fade out
          heroCanvas.style.transform = `translateY(${scrollY * 0.5}px) scale(${scale})`; // Parallax & Scale
        }
        
        tickingScroll = false;
      });
      tickingScroll = true;
    }
  });

  // ── 3D Hero Canvas Animation ──
  const canvas = document.getElementById('heroCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    
    const particles = [];
    const particleCount = 140;
    const connectionDistance = 120;
    let time = 0;
    
    let mouseX = 0, mouseY = 0;
    let targetRotationX = 0, targetRotationY = 0;
    let currentRotationX = 0, currentRotationY = 0;
    
    window.addEventListener('mousemove', function(e) {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      targetRotationY = mouseX * 0.4;
      targetRotationX = mouseY * 0.4;
    });

    function resize() {
      width = canvas.width = window.innerWidth;
      const hero = document.getElementById('hero');
      height = canvas.height = hero ? hero.offsetHeight : window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Fibonacci sphere distribution
    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const r = Math.min(width, height) * 0.35; // Responsive radius
      
      const x = r * Math.cos(theta) * Math.sin(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(phi);
      
      particles.push({
        baseX: x, baseY: y, baseZ: z,
        randomOffset: Math.random() * Math.PI * 2
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      time += 0.003;
      
      currentRotationX += (targetRotationX - currentRotationX) * 0.05;
      currentRotationY += (targetRotationY - currentRotationY) * 0.05;
      
      const cx = width / 2;
      const cy = height / 2;
      const rotY = time + currentRotationY;
      const rotX = currentRotationX;
      
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      
      const projected = [];
      
      // Project 3D to 2D
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        const breathe = 1 + Math.sin(time * 8 + p.randomOffset) * 0.03;
        let x = p.baseX * breathe, y = p.baseY * breathe, z = p.baseZ * breathe;
        
        let nx = x * cosY - z * sinY;
        let nz = x * sinY + z * cosY;
        x = nx; z = nz;
        
        let ny = y * cosX - z * sinX;
        nz = y * sinX + z * cosX;
        y = ny; z = nz;
        
        const scale = 1000 / (1000 + z);
        projected.push({ x: cx + x * scale, y: cy + y * scale, z: z, scale: scale });
      }
      
      // Draw Connections
      ctx.lineWidth = 1;
      for (let i = 0; i < particleCount; i++) {
        const p1 = projected[i];
        if (p1.z < -400) continue; 
        
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = projected[j];
          if (p2.z < -400) continue;
          
          const dx = p1.x - p2.x, dy = p1.y - p2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * (p1.scale * p2.scale) * 0.4;
            if (opacity > 0) {
              ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
              ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            }
          }
        }
      }
      
      // Draw Nodes
      for (let i = 0; i < particleCount; i++) {
        const p = projected[i];
        if (p.z < -400) continue;
        const opacity = Math.min(1, Math.max(0.1, p.scale));
        ctx.fillStyle = `rgba(6, 182, 212, ${opacity})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, 1.5 * p.scale), 0, Math.PI * 2); ctx.fill();
      }
      
      requestAnimationFrame(render);
    }
    render();
  }

  // ── Navbar scroll effect ──
  const nav = document.getElementById('nav');

  function handleNavScroll() {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // Check on load

  // ── Mobile nav toggle ──
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Close mobile nav when a link is clicked
    navLinks.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.classList.remove('active');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Smooth scroll for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const navHeight = nav ? nav.offsetHeight : 0;
        const targetPosition = targetEl.getBoundingClientRect().top + window.scrollY - navHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ── Scroll Reveal (Intersection Observer) ──
  const revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target); // Only animate once
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
      }
    );

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Fallback: show everything if IntersectionObserver not supported
    revealElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // ── Animated Number Counters ──
  const counters = document.querySelectorAll('.counter');
  const counterAnimated = new Set();

  function animateCounter(el) {
    if (counterAnimated.has(el)) return;
    counterAnimated.add(el);

    const target = parseInt(el.getAttribute('data-target'), 10);
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    const startValue = 0;

    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const currentValue = Math.round(startValue + (target - startValue) * easedProgress);

      el.textContent = currentValue;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(updateCounter);
  }

  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.5
      }
    );

    counters.forEach(function (counter) {
      counterObserver.observe(counter);
    });
  } else {
    // Fallback
    counters.forEach(function (counter) {
      counter.textContent = counter.getAttribute('data-target');
    });
  }

  // ── Active nav link highlighting ──
  const sections = document.querySelectorAll('section[id]');
  const navLinksAll = document.querySelectorAll('.nav__link');

  if ('IntersectionObserver' in window && sections.length > 0) {
    const sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinksAll.forEach(function (link) {
              link.style.color = '';
              if (link.getAttribute('href') === '#' + id) {
                link.style.color = 'var(--primary-light)';
              }
            });
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '-80px 0px -50% 0px'
      }
    );

    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  // ── Keyboard accessibility for service cards ──
  document.querySelectorAll('.service-card').forEach(function (card) {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'article');
  });

  // ── Prefetch on hover (performance) ──
  document.querySelectorAll('a[href^="http"]').forEach(function (link) {
    link.addEventListener('mouseenter', function () {
      const href = this.getAttribute('href');
      if (href && !document.querySelector('link[href="' + href + '"]')) {
        const prefetch = document.createElement('link');
        prefetch.rel = 'dns-prefetch';
        prefetch.href = href;
        document.head.appendChild(prefetch);
      }
    }, { once: true });
  });

})();

// Before/After Slider Logic
document.addEventListener("DOMContentLoaded", function() {
  const slider = document.getElementById("sliderInput");
  const afterImage = document.getElementById("afterImage");
  const sliderLine = document.getElementById("sliderLine");
  
  if(slider && afterImage && sliderLine) {
    slider.addEventListener("input", function(e) {
      const sliderVal = e.target.value;
      afterImage.style.width = sliderVal + "%";
      sliderLine.style.left = sliderVal + "%";
    });
  }
});

// Sticky Scroll Showcase Logic
document.addEventListener("DOMContentLoaded", function() {
  const showcaseItems = document.querySelectorAll(".showcase-item");
  const showcaseCards = document.querySelectorAll(".sticky-showcase__card");
  
  if (showcaseItems.length > 0 && showcaseCards.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: "-25% 0px -55% 0px", // Trigger when card occupies the center area
      threshold: 0.1
    };

    const showcaseObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const targetCardId = entry.target.getAttribute("data-target-card");
          
          // Remove active class from all cards
          showcaseCards.forEach(card => card.classList.remove("active"));
          
          // Add active class to target card
          const targetCard = document.getElementById(targetCardId);
          if (targetCard) {
            targetCard.classList.add("active");
          }
        }
      });
    }, observerOptions);

    showcaseItems.forEach(item => {
      showcaseObserver.observe(item);
    });
  }

  // Showcase Before/After Slider Logic
  const showcaseSlider = document.getElementById("showcaseSliderInput");
  const showcaseAfterImage = document.getElementById("showcaseAfterImage");
  const showcaseSliderLine = document.getElementById("showcaseSliderLine");
  
  if (showcaseSlider && showcaseAfterImage && showcaseSliderLine) {
    showcaseSlider.addEventListener("input", function(e) {
      const sliderVal = e.target.value;
      showcaseAfterImage.style.width = sliderVal + "%";
      showcaseSliderLine.style.left = sliderVal + "%";
    });
  }

  // Looped Terminal Logs Logic for YouTube Showcase Item
  const homeLogs = [
    '127.0.0.1 - - [29/Jun/2026 18:20:55] "POST /render HTTP/1.1" 202 -',
    '<span style="color: #fbbf24;">--- OPENMONTAGE AGENT STARTING ---</span>',
    'Task: Generate video for topic \'The Lead Masks of Vintem Hill, 1966\'',
    '<span style="color: #a78bfa;">1. Parsing n8n script into scene plan via Gemini...</span>',
    'Title: The Lead Masks of Vintem Hill, 1966',
    '<span style="color: #a78bfa;">2. Fetching Pexels assets...</span>',
    '  - Downloaded asset for \'dark fog eyes\'',
    '  - Downloaded asset for \'two men suits\'',
    '  - Downloaded asset for \'lead mask face\'',
    '  - Downloaded asset for \'police investigation\'',
    '<span style="color: #a78bfa;">2b. Generating voiceover and subtitles via edge-tts...</span>',
    '  Split script into 5 segments.',
    '  -> Synthesizing segment 1/5 with en-US-Aria... done.',
    '  -> Concatenating audio clips...',
    '<span style="color: #a78bfa;">3. Generating Remotion Edit Decisions...</span>',
    '<span style="color: #a78bfa;">4. Rendering video with Remotion engine...</span>',
    'Bundled code         ━━━━━━━━━━━━━━━━━━ 2484ms',
    'Codec                h264',
    'Output               D:\\output_short.mp4',
    'Rendering frames     ━━━━━━━━━━━━━━━━━━ 100%',
    'Encoded video        ━━━━━━━━━━━━━━━━━━ 45837ms',
    '<span style="color: #22c55e;">SUCCESS: Video rendered to output_short.mp4</span>',
    '<span style="color: #60a5fa;">Automatically uploading to YouTube...</span>',
    'Authenticating with YouTube API...',
    'Uploading output_short.mp4 to YouTube...',
    '<span style="color: #22c55e; font-weight: bold;">SUCCESS! Video automatically uploaded!</span>',
    'Video ID: tvAEmBdORfA',
    'Waiting for next cron trigger...'
  ];

  const homeTerminal = document.getElementById('home-terminal-output');
  if (homeTerminal) {
    let lineIdx = 0;

    function typeHomeLine() {
      if (lineIdx < homeLogs.length) {
        const p = document.createElement('div');
        p.innerHTML = homeLogs[lineIdx];
        p.style.marginBottom = '4px';
        homeTerminal.appendChild(p);
        homeTerminal.scrollTop = homeTerminal.scrollHeight;
        lineIdx++;

        let delay = Math.random() * 150 + 50;
        if (homeLogs[lineIdx - 1].includes("Rendering frames")) delay = 800;
        if (homeLogs[lineIdx - 1].includes("Uploading output_short.mp4")) delay = 1000;

        setTimeout(typeHomeLine, delay);
      } else {
        // Loop restart
        setTimeout(() => {
          homeTerminal.innerHTML = '';
          lineIdx = 0;
          setTimeout(typeHomeLine, 1000);
        }, 5000); // Wait 5 seconds before clearing and restarting
      }
    }

    // Run when in view
    const homeTermObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setTimeout(typeHomeLine, 500);
        homeTermObserver.disconnect();
      }
    }, { threshold: 0.1 });
    homeTermObserver.observe(homeTerminal);
  }
});

// Lead Capture Form
document.addEventListener("DOMContentLoaded", function() {
  const leadBtn      = document.getElementById("leadBtn");
  const leadInput    = document.getElementById("leadInput");
  const leadInitial  = document.getElementById("leadInitial");
  const leadLoader   = document.getElementById("leadLoader");
  const leadSuccess  = document.getElementById("leadSuccess");
  const leadDone     = document.getElementById("leadDone");
  const leadEmailForm = document.getElementById("leadEmailForm");
  const leadEmail    = document.getElementById("leadEmail");
  const leadSubmitBtn = document.getElementById("leadSubmitBtn");
  const leadEmailError = document.getElementById("leadEmailError");

  // Step 1 → 2 → 3: simulate analysis
  if (leadBtn && leadInput) {
    leadBtn.addEventListener("click", function(e) {
      e.preventDefault();
      const val = leadInput.value.trim();
      if (!val) {
        leadInput.focus();
        leadInput.style.borderColor = "#ef4444";
        setTimeout(() => leadInput.style.borderColor = "", 2000);
        return;
      }
      leadInitial.style.display = "none";
      leadLoader.style.display  = "block";

      setTimeout(function() {
        leadLoader.style.display  = "none";
        leadSuccess.style.display = "block";
      }, 3500);
    });
  }

  // Step 3 → 4: send email via Formspree
  // SETUP: Go to https://formspree.io → sign up → create a form → paste the endpoint below
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

  if (leadEmailForm) {
    leadEmailForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const email = leadEmail.value.trim();
      if (!email) return;

      leadSubmitBtn.textContent = "Sending...";
      leadSubmitBtn.disabled = true;
      leadEmailError.style.display = "none";

      // Store the business URL the user entered (carried from step 1)
      const businessInput = leadInput ? leadInput.value.trim() : "";

      try {
        const res = await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email: email, business: businessInput, _subject: "New AI Analysis Lead — CodeVantage" })
        });

        if (res.ok) {
          leadSuccess.style.display = "none";
          leadDone.style.display    = "block";
        } else {
          throw new Error("Formspree error");
        }
      } catch {
        leadEmailError.style.display = "block";
        leadSubmitBtn.textContent = "Send Report";
        leadSubmitBtn.disabled = false;
      }
    });
  }
});
