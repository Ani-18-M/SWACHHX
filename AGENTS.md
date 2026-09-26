<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Screen Implementation Standard (Strictly Enforced)
1. **Concise & Relevant Copy**: Remove unwanted, unrelated, long, and wordy/reedy text from all fields and labels. Keep microcopy crisp and purposeful.
2. **Curated Components**: Include only required components per screen; eliminate clutter and technical jargon.
3. **Required Component Sections**: Structure each screen into clear, well-scoped functional sections as needed.
4. **Advanced Animations**: Implement polished, purposeful animations (e.g. live state pulses, route progression, smooth collapsible accordion transitions, dynamic progress indicators).
5. **Harmonized Color Theme**: Match the established palette:
   - Page Background: Clean light slate/off-white (`bg-slate-50/60` or `#F8FAFC`).
   - Cards/Tiles: Crisp white surfaces (`bg-white border-slate-200 shadow-xs`) with dark contrast accents (`bg-[#0B0F19]` / `bg-[#1E293B]`) where appropriate.
   - Primary Accent: SWACHHX Emerald (`#10B981` / `emerald-600`).
   - Status Accents: Red (`rose-500`/`red-500`), Amber (`amber-500`), Sky (`sky-500`).
   - Bubbled icon pins for vehicles and assets (no raw dots or arrows).
6. **Flawless Functionality & Navigation**: Ensure all buttons, filters, modals, dispatches, and navigation links route and react with store state and feedback toasts.
7. **Minimal, Professional & Clean Look**: Maintain high visual hierarchy, clean typography, rounded radii (`rounded-xl` / `rounded-2xl`), and balanced weight.
8. **Spacious Component Layout**: Strictly preserve generous spacing between components and rows (`space-y-10 sm:space-y-12`, `gap-6 xl:gap-7`, `p-4 sm:p-5`) for an airy, uncluttered feel.
