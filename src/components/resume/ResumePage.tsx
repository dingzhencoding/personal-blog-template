import type { CSSProperties } from "react";
import { ResumeMarkdown } from "@/components/content/Markdown";
import type { Resume, ResumeSource } from "@/lib/content/resume";
import PdfViewer from "./PdfViewer";
import ResumeEffects from "./ResumeEffects";
import "./Resume.css";

// Hide reveal targets only when JS runs and motion is allowed, before paint.
const effectsBootstrap = "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.currentScript.parentElement.dataset.effects='on'}catch(e){}";

const delay = (index: number) => ({ "--i": index }) as CSSProperties;

function Hero({ resume, pdf }: { resume: Resume; pdf: string | null }) {
  const initial = Array.from(resume.name)[0] ?? "✦";
  return (
    <header className="rs-hero">
      <div className="rs-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="rs-hero-grid">
        <div className="rs-avatar" data-reveal style={delay(0)}>
          <span className="rs-avatar-ring" aria-hidden="true" />
          <span className="rs-avatar-orbit" aria-hidden="true"><i /></span>
          {resume.avatar
            ? <img src={resume.avatar} alt={resume.name} width={160} height={160} />
            : <span className="rs-avatar-initial" aria-hidden="true">{initial}</span>}
        </div>
        <div className="rs-hero-copy">
          <p className="rs-eyebrow" data-reveal style={delay(1)}><span aria-hidden="true">✦</span> RESUME · 个人简历</p>
          <h1 className="rs-name" data-reveal style={delay(2)}>{resume.name}</h1>
          {resume.roles.length > 0 && (
            <p className="rs-role" data-reveal style={delay(3)}>
              <span className="rs-role-prompt" aria-hidden="true">&gt;</span>
              <span className="rs-typed" data-roles={JSON.stringify(resume.roles)}>{resume.roles[0]}</span>
              <span className="rs-caret" aria-hidden="true" />
              {resume.roles.length > 1 && <span className="visually-hidden">{resume.roles.join(" / ")}</span>}
            </p>
          )}
          {resume.summary && <p className="rs-summary" data-reveal style={delay(4)}>{resume.summary}</p>}
          {(resume.location || resume.contacts.length > 0) && (
            <ul className="rs-contacts" data-reveal style={delay(5)} aria-label="联系方式">
              {resume.location && <li><span className="rs-contact-label">所在地</span>{resume.location}</li>}
              {resume.contacts.map(contact => (
                <li key={`${contact.label}-${contact.value}`}>
                  <span className="rs-contact-label">{contact.label}</span>
                  {contact.href
                    ? <a href={contact.href} {...(/^https?:/i.test(contact.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{contact.value}</a>
                    : contact.value}
                </li>
              ))}
            </ul>
          )}
          <div className="rs-actions" data-reveal style={delay(6)}>
            {pdf && <a className="rs-btn rs-btn--primary" href={pdf} download><span aria-hidden="true">↓</span> 下载 PDF</a>}
            {pdf && <a className="rs-btn" href="#resume-pdf" data-resume-action="view-pdf"><span aria-hidden="true">▤</span> 在线查看</a>}
            <button type="button" className="rs-btn rs-btn--ghost" data-resume-action="print"><span aria-hidden="true">⎙</span> 打印</button>
          </div>
        </div>
      </div>
      {resume.stats.length > 0 && (
        <dl className="rs-stats">
          {resume.stats.map((stat, index) => (
            <div className="rs-stat rs-card" key={stat.label} data-reveal style={delay(index)}>
              <dt>{stat.label}</dt>
              <dd data-count={stat.value}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}

function SectionHead({ index, title, id }: { index: number; title: string; id: string }) {
  return (
    <header className="rs-sec-head" data-reveal>
      <span className="rs-sec-index" aria-hidden="true">{String(index).padStart(2, "0")}</span>
      <h2 id={`${id}-title`}>{title}</h2>
      <span className="rs-sec-rule" aria-hidden="true" />
    </header>
  );
}

function ResumeBody({ resume, pdf }: { resume: Resume; pdf: string | null }) {
  const titled = resume.sections.filter(section => section.title);
  const navItems = [
    ...(resume.skills.length ? [{ id: "skills", title: "技能" }] : []),
    ...titled.map(section => ({ id: section.id, title: section.title })),
    ...(pdf ? [{ id: "pdf", title: "PDF" }] : []),
  ];
  let index = 0;
  return (
    <>
      <Hero resume={resume} pdf={pdf} />
      {navItems.length > 1 && (
        <nav className="rs-dots" aria-label="简历目录">
          {navItems.map(item => <a key={item.id} href={`#${item.id}`}><span>{item.title}</span></a>)}
        </nav>
      )}
      {resume.skills.length > 0 && (
        <section className="rs-section" id="skills" aria-labelledby="skills-title">
          <SectionHead index={++index} title="技能" id="skills" />
          <div className="rs-skills">
            {resume.skills.map((group, groupIndex) => (
              <div className="rs-skill-group rs-card" key={group.group || groupIndex} data-reveal style={delay(groupIndex)}>
                {group.group && <h3>{group.group}</h3>}
                <ul>{group.items.map((skill, skillIndex) => <li key={skill} style={delay(skillIndex)}>{skill}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>
      )}
      {resume.sections.map(section => section.title ? (
        <section className="rs-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
          <SectionHead index={++index} title={section.title} id={section.id} />
          {section.intro && <div className="rs-card rs-prose rs-intro" data-reveal><ResumeMarkdown source={section.intro} /></div>}
          {section.items.length > 0 && (
            <ol className="rs-timeline">
              {section.items.map((item, itemIndex) => (
                <li className="rs-tl-item" key={`${item.title}-${itemIndex}`}>
                  <span className="rs-tl-node" aria-hidden="true" />
                  <article className="rs-card rs-entry" data-reveal style={delay(0)}>
                    <header>
                      <h3>{item.title}</h3>
                      {item.meta && <span className="rs-entry-meta">{item.meta}</span>}
                    </header>
                    {item.body && <div className="rs-prose"><ResumeMarkdown source={item.body} /></div>}
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : (
        <section className="rs-section" key={section.id}>
          <div className="rs-card rs-prose rs-intro" data-reveal><ResumeMarkdown source={section.intro} /></div>
        </section>
      ))}
      {pdf && (
        <section className="rs-section" id="pdf" aria-labelledby="pdf-title">
          <SectionHead index={++index} title="PDF 版本" id="pdf" />
          <PdfViewer src={pdf} autoLoad={false} />
        </section>
      )}
      <footer className="rs-foot">最后更新 · {resume.updated}</footer>
    </>
  );
}

function PdfOnly({ pdf, updated }: { pdf: string; updated: string }) {
  return (
    <>
      <header className="rs-hero rs-hero--compact">
        <div className="rs-aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="rs-hero-copy rs-hero-copy--center">
          <p className="rs-eyebrow" data-reveal style={delay(0)}><span aria-hidden="true">✦</span> RESUME · 个人简历</p>
          <h1 className="rs-name" data-reveal style={delay(1)}>个人简历</h1>
          <div className="rs-actions" data-reveal style={delay(2)}>
            <a className="rs-btn rs-btn--primary" href={pdf} download><span aria-hidden="true">↓</span> 下载 PDF</a>
            <button type="button" className="rs-btn rs-btn--ghost" data-resume-action="print"><span aria-hidden="true">⎙</span> 打印</button>
          </div>
        </div>
      </header>
      <section className="rs-section" id="pdf" aria-label="PDF 简历">
        <PdfViewer src={pdf} autoLoad />
      </section>
      {updated && <footer className="rs-foot">最后更新 · {updated}</footer>}
    </>
  );
}

function EmptyResume() {
  return (
    <header className="rs-hero rs-hero--compact">
      <div className="rs-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="rs-hero-copy rs-hero-copy--center">
        <p className="rs-eyebrow" data-reveal style={delay(0)}><span aria-hidden="true">✦</span> RESUME · 个人简历</p>
        <h1 className="rs-name" data-reveal style={delay(1)}>简历整理中</h1>
        <p className="rs-summary" data-reveal style={delay(2)}>新的履历正在星图上标注，稍后再来看看。</p>
      </div>
    </header>
  );
}

export default function ResumePage({ source }: { source: ResumeSource }) {
  const { resume, pdf, pdfUpdated } = source;
  return (
    <main className="rs">
      <script dangerouslySetInnerHTML={{ __html: effectsBootstrap }} />
      {resume ? <ResumeBody resume={resume} pdf={pdf} /> : pdf ? <PdfOnly pdf={pdf} updated={pdfUpdated} /> : <EmptyResume />}
      <ResumeEffects />
    </main>
  );
}
