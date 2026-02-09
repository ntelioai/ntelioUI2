# I Built a UI Framework in 2022 While Everyone Was Using React. Here's Why.

In 2022, React was the rising king. Every job post demanded it. The kids ("kids" compared to this particular quinquagenarian) built their careers on it. Every tutorial taught it. Every conference talked about it. The world was a virtual DOM with a million dangling tools and node modules. After all, who could argue with the sophistication of Meta's engineering powerhouses?

So back then, if you had told a room of developers you were building a UI widget library from scratch — with jQuery — they'd look at you like you're a cryogenically frozen creature from the 2000s who just thawed.

Here's the thing though. When I started building ntelio.ai in 2022, I knew we'd need a lot of UI work. And I knew exactly how that story ends with the latest, coolest frameworks — because I'd lived it. Through the 2010s, our services team at elementn delivered dozens of enterprise projects. We integrated jQuery, Dojo Toolkit, two Angulars, and React across various clients. Each one came with its own learning curve, its own toolchain drama, and its own hit to our productivity and bottom line. So when I looked at the "hipster" frameworks my new hires idolized, I saw neither innovation nor productivity. I saw the same expensive pattern repeating itself. It was clear that things could be simpler.

## Don't read this as a manifesto against React! (it is ;)

**The brutal onboarding cliff that everyone knew about but accepted as the cost of doing business**

A junior (or less junior) developer joining my team needed to learn: React itself, JSX, hooks, state management (Redux? Zustand? Context? Pick one, we changed it twice), a build toolchain (webpack, then Vite, then whatever came next), CSS-in-JS or Tailwind or CSS modules, TypeScript (optional but not really), and a routing library that broke every major version.

**That's not a framework. That's a curriculum.**

And I was paying developers to build products, not to study.

I watched smart, capable developers spend **weeks** just to feel comfortable pushing code. Not because they lacked talent — because the ecosystem demanded they learn 12 things before they could change a button color.

## The Bet

So I made a bet that went against everything the industry was saying.

While I always kept an intimacy with my engineering organization's output (and underlying tech), I hadn't written production code for almost two decades at that point. Two weeks of productivity is all I could gamble with — and that's exactly what I spent for building the initial release.

I called it **ntelioUI** — a super lightweight widget framework built on jQuery, Bootstrap, and ES6 modules. Small footprint. No build step. No transpiler. No package manager. Just JavaScript that runs in the browser exactly as written. Fun stuff.

## Enlightenment? Not.

**I think somewhere in their eternal pursuit of abstraction nirvana, developers forgot a few things: ES6 is here. Browsers are extremely fast already. Bandwidth is plentiful. And files get cached at multiple levels on their way to consumers. So what exactly are we bundling and transpiling for?**

The philosophy was simple:

- **The browser's DOM is the browser's DOM.** I wish we could just use a GUI toolkit to build applications, but it is what it is. The browser has been engineered by consensus on the internet, basically a "democratically elected" system that won't go away. Oxymoron, I know. So let's "make lemonade" instead of attempting to change paradigms to come up with... another DOM.
- **ES6 modules are a web standard.** We don't need a bundler to use import/export, to scale code by organizing in modules, to encapsulate behavior in classes, to create real widgets, to extend them into new ones. Duh.
- **jQuery has the largest plugin ecosystem ever built.** 100K+ widgets ready to wrap and use. Eureka.
- **Bootstrap gave us 80% of the UI surface area that modern React stacks recreate through multiple libraries.** Grid layout, responsive design, modals, forms, navbars, tabs — all from a single CDN link. No `npm install`, no version conflicts, no wrapper components.
- **You write code, it goes to production.** No intermediate steps, no build pipeline, no waiting. Sorry if the reload button doesn't look sophisticated enough.
- **A `<script>` tag is your entire toolchain.** New developer onboarding is "open the HTML file."

People told me I was going backwards. I told them I was removing obstacles.

## What Actually Happened thereafter

New developers were modifying/building widgets in 1 day and application modules that would ship to production in a week. Not because they were exceptional (maybe some were). Because **there was nothing standing between them and the work.**

No `node_modules` folder with 847 dependencies. No mysterious build errors. No "works on my machine." No debugging source maps to find your actual code. Open DevTools, see your code, set a breakpoint. Done.

We started churning out projects. PoCs -so important in an early stage enterprise tech startup- were shipping daily, we were delivering major product releases bi-monthly and customer projects in weeks. The team was productive in a way I hadn't seen when we were fighting the toolchain instead of building the product.

And this was **before AI coding agents were a thing.** Just developers, a simple framework, and zero friction between an idea and a deployed feature. Now that agents are doing 80% of the work, ntelioUI is still paying off. We can read the code, understand what's happening, and step in to fix whatever the AI missed.

## The Industry Kept Proving the Point

In the years since, I watched React go from class components to hooks to server components to server actions. Each shift essentially told developers: "Remember everything you learned? Forget it. Here's the new way."

Meanwhile, our codebase looked the same as it did in 2022. Because we built on web standards that don't change:

- **ES6 modules** — supported in every browser, stable since 2018
- **CSS custom properties** — native theming, no runtime overhead
- **The DOM** — it's not going anywhere
- **jQuery** — 15 years of stability, still works exactly as documented
- **Bootstrap** — responsive grid, modals, navbars, forms — all the UI components React developers need a separate library for, included out of the box

Our framework didn't need a migration guide because the web platform didn't break it.

## The Real Lesson

This was never about jQuery vs React. It was about asking a question that doesn't get asked enough:

**What is the actual cost of your tooling?**

Not the download size. Not the benchmark score. The real cost:

- How long before a new hire ships their first feature?
- How many hours per week does your team spend fighting the build system?
- How often do you rewrite working code because the framework changed?
- How much of your complexity exists to serve the product vs. to serve the toolchain?

Some will argue that React is necessary for complex SPAs with heavy shared state. But complexity doesn't come from the problem — it comes from the tooling. A widget tree with event bubbling, a global event bus, and a 30-line observable store covers the same ground as React + Redux + Context. The difference is you can read all of it in an afternoon.

For the **vast majority** of projects I've seen, the complexity isn't serving the product. It's serving itself.

## Fast Forward to 2026

Today, with AI agents that can write and debug code, the simplicity advantage has compounded. An AI can read a ntelioUI widget — a plain JavaScript class with a template, a lifecycle, and events — and understand it immediately. There's no framework magic to hallucinate about, no virtual DOM reconciliation to get wrong, no hook dependency arrays to mess up.

**Simple code is AI-friendly code.** That wasn't the reason I built it this way, but it turned out to be one of the biggest long-term wins.

We recently started modernizing the framework as **ntelioUI2** — same philosophy, cleaner articulations, more documentation. The rewrite using Claude code took a week. Not because we had to undo years of tech debt, but because there wasn't much to undo. Simple foundations age well.

## The Takeaway

If you're building a product or executing a project and your developers are spending more time configuring tools than delivering, you don't have a framework problem. You have a **friction** problem.

Sometimes the most radical thing you can do is choose the boring, simple, proven technology and just ship.

Now let me put my CEO hat back on: **framework choices are management decisions disguised as technical ones. Friction shows up on the balance sheet. Always.**

---

*What's your experience? Have you seen teams slow down because the toolchain was more complex than the product? I'd love to hear from others who made unconventional technology choices and how they played out.*
