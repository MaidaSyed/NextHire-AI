import { useMemo } from 'react'

const TEMPLATE_LABELS = {
  template1: 'Modern Minimal',
  template2: 'Corporate Professional',
  template3: 'Creative Designer',
  template4: 'ATS Friendly',
}

const TEMPLATE_ORDER = ['template1', 'template2', 'template3', 'template4']

function hasValue(value) {
  return String(value ?? '').trim().length > 0
}

function formatRange(startYear, endYear) {
  const start = hasValue(startYear) ? startYear : ''
  const end = hasValue(endYear) ? endYear : ''
  if (!start && !end) return ''
  if (!start) return end
  if (!end) return `${start} - Present`
  return `${start} - ${end}`
}

function hasEntries(list, keys) {
  return Array.isArray(list) && list.some((item) => keys.some((key) => hasValue(item?.[key])))
}

function Template1Preview({ data }) {
  const { name = '', email = '', phone = '', linkedin = '', location = '', objective = '', education = [], experience = [], skills = [], projects = [] } = data

  const visibleSkills = skills.filter((skill) => hasValue(skill?.name))
  const visibleProjects = projects.filter((project) => hasValue(project?.name) || hasValue(project?.description))

  return (
    <div className="h-full w-full bg-white text-slate-900" style={{ padding: '24mm 18mm' }}>
      <div className="border-b-2 border-slate-900 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] leading-[1.08] font-semibold tracking-[0.2px] text-slate-900">{name || 'Your Name'}</h1>
            {objective ? <p className="mt-2 max-w-[560px] text-[13px] leading-6 text-slate-700">{objective}</p> : null}
          </div>
          <div className="min-w-[220px] text-right text-[12.5px] leading-6 text-slate-900">
            {location ? <div className="whitespace-nowrap">{location}</div> : null}
            {email ? <div className="whitespace-nowrap">{email}</div> : null}
            {phone ? <div className="whitespace-nowrap">{phone}</div> : null}
            {linkedin ? <div className="whitespace-nowrap text-slate-700">{linkedin}</div> : null}
          </div>
        </div>
      </div>

      <main className="mt-4 space-y-4">
        {visibleSkills.length > 0 ? (
          <section>
            <h2 className="mb-2 text-[14px] uppercase tracking-[0.8px] text-slate-900">Skills</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {visibleSkills.map((skill, index) => (
                <div key={`${skill.name}-${index}`} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1.5 text-[12.5px]">
                  <span className="font-semibold">{skill.name}</span>
                  <span className="text-slate-600">{skill.level}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {hasEntries(experience, ['title', 'company', 'description']) ? (
          <section>
            <h2 className="mb-2 text-[14px] uppercase tracking-[0.8px] text-slate-900">Experience</h2>
            <div className="space-y-2.5">
              {experience.map((job, index) => {
                if (!hasValue(job?.title) && !hasValue(job?.company) && !hasValue(job?.description)) return null
                return (
                  <article key={`${job?.title || 'exp'}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[13px] font-semibold leading-5">{job?.title || 'Job Title'}</div>
                      <div className="whitespace-nowrap text-[12.5px] text-slate-600">{formatRange(job?.startYear, job?.endYear)}</div>
                    </div>
                    <div className="text-[12.5px] text-slate-700">{job?.company || 'Company'}</div>
                    {hasValue(job?.description) ? <p className="mt-1 text-[12px] leading-5 text-slate-700 whitespace-pre-wrap">{job.description}</p> : null}
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {hasEntries(education, ['degree', 'institution']) ? (
          <section>
            <h2 className="mb-2 text-[14px] uppercase tracking-[0.8px] text-slate-900">Education</h2>
            <div className="space-y-2.5">
              {education.map((item, index) => {
                if (!hasValue(item?.degree) && !hasValue(item?.institution)) return null
                return (
                  <article key={`${item?.degree || 'edu'}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[13px] font-semibold leading-5">{item?.degree || 'Degree'}</div>
                      <div className="whitespace-nowrap text-[12.5px] text-slate-600">{formatRange(item?.startYear, item?.endYear)}</div>
                    </div>
                    <div className="text-[12.5px] text-slate-700">{item?.institution || 'University'}</div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {visibleProjects.length > 0 ? (
          <section>
            <h2 className="mb-2 text-[14px] uppercase tracking-[0.8px] text-slate-900">Projects</h2>
            <div className="space-y-2.5">
              {visibleProjects.map((project, index) => (
                <article key={`${project?.name || 'project'}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2.5">
                  <div className="text-[13px] font-semibold leading-5">{project?.name || 'Project Name'}</div>
                  {hasValue(project?.technologies) ? <div className="mt-0.5 text-[12px] text-slate-600">Tech: {project.technologies}</div> : null}
                  {hasValue(project?.description) ? <p className="mt-1 text-[12px] leading-5 text-slate-700 whitespace-pre-wrap">{project.description}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function Template2Preview({ data }) {
  const { name = '', email = '', phone = '', linkedin = '', location = '', objective = '', education = [], experience = [], skills = [], projects = [] } = data

  const visibleSkills = skills.filter((skill) => hasValue(skill?.name))
  const visibleProjects = projects.filter((project) => hasValue(project?.name) || hasValue(project?.description))

  return (
    <div className="h-full w-full bg-white text-slate-900" style={{ padding: '22mm 16mm' }}>
      <header className="border-b-2 border-slate-900 pb-3">
        <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[0.2px]">{name || 'Your Name'}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-slate-600">
          {location ? <span>{location}</span> : null}
          {email ? <><span className="text-slate-400">•</span><span>{email}</span></> : null}
          {phone ? <><span className="text-slate-400">•</span><span>{phone}</span></> : null}
          {linkedin ? <><span className="text-slate-400">•</span><span>{linkedin}</span></> : null}
        </div>
      </header>

      {objective ? (
        <section className="mt-4">
          <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Objective</h2>
          <p className="mt-2 text-[13px] leading-6 text-slate-700">{objective}</p>
        </section>
      ) : null}

      <main className="mt-4 grid grid-cols-[0.92fr_1.55fr] gap-4">
        <aside className="border-r border-slate-200 pr-4">
          {visibleSkills.length > 0 ? (
            <section>
              <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Skills</h2>
              <div className="mt-2 space-y-2">
                {visibleSkills.map((skill, index) => (
                  <div key={`${skill.name}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2">
                    <div className="text-[13px] font-semibold">{skill.name}</div>
                    <div className="text-[12px] text-slate-600">{skill.level}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>

        <section className="space-y-4">
          {hasEntries(experience, ['title', 'company', 'description']) ? (
            <div>
              <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Experience</h2>
              <div className="mt-2 space-y-3 border-l-2 border-slate-900 pl-4">
                {experience.map((job, index) => {
                  if (!hasValue(job?.title) && !hasValue(job?.company) && !hasValue(job?.description)) return null
                  return (
                    <article key={`${job?.title || 'exp'}-${index}`} className="relative">
                      <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                      <div className="text-[13px] font-semibold leading-5">{job?.title || 'Job Title'}</div>
                      <div className="text-[12.5px] text-slate-700">{job?.company || 'Company'}</div>
                      {formatRange(job?.startYear, job?.endYear) ? <div className="text-[12px] text-slate-600">{formatRange(job?.startYear, job?.endYear)}</div> : null}
                      {hasValue(job?.description) ? <p className="mt-1 text-[12px] leading-5 text-slate-700 whitespace-pre-wrap">{job.description}</p> : null}
                    </article>
                  )
                })}
              </div>
            </div>
          ) : null}

          {hasEntries(education, ['degree', 'institution']) ? (
            <div>
              <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Education</h2>
              <div className="mt-2 space-y-3 border-l-2 border-slate-900 pl-4">
                {education.map((item, index) => {
                  if (!hasValue(item?.degree) && !hasValue(item?.institution)) return null
                  return (
                    <article key={`${item?.degree || 'edu'}-${index}`} className="relative">
                      <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                      <div className="text-[13px] font-semibold leading-5">{item?.degree || 'Degree'}</div>
                      <div className="text-[12.5px] text-slate-700">{item?.institution || 'University'}</div>
                      {formatRange(item?.startYear, item?.endYear) ? <div className="text-[12px] text-slate-600">{formatRange(item?.startYear, item?.endYear)}</div> : null}
                    </article>
                  )
                })}
              </div>
            </div>
          ) : null}

          {visibleProjects.length > 0 ? (
            <div>
              <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Projects</h2>
              <div className="mt-2 space-y-3 border-l-2 border-slate-900 pl-4">
                {visibleProjects.map((project, index) => (
                  <article key={`${project?.name || 'project'}-${index}`} className="relative">
                    <span className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                    <div className="text-[13px] font-semibold leading-5">{project?.name || 'Project Name'}</div>
                    {hasValue(project?.technologies) ? <div className="text-[12px] text-slate-600">Tech: {project.technologies}</div> : null}
                    {hasValue(project?.description) ? <p className="mt-1 text-[12px] leading-5 text-slate-700 whitespace-pre-wrap">{project.description}</p> : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

function Template3Preview({ data }) {
  const { name = '', email = '', phone = '', linkedin = '', location = '', objective = '', education = [], experience = [], skills = [], projects = [] } = data

  const visibleSkills = skills.filter((skill) => hasValue(skill?.name))
  const visibleProjects = projects.filter((project) => hasValue(project?.name) || hasValue(project?.description))

  return (
    <div className="h-full w-full bg-white text-slate-900" style={{ padding: '20mm 16mm' }}>
      <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3 font-serif">
        <div>
          <h1 className="text-[34px] leading-[1.08] tracking-[0.3px]">{name || 'Your Name'}</h1>
          {objective ? <p className="mt-2 max-w-[560px] text-[13.5px] leading-6 text-slate-700">{objective}</p> : null}
        </div>
        <div className="min-w-[250px] text-right text-[12.5px] leading-6 text-slate-900">
          {location ? <div className="whitespace-nowrap">{location}</div> : null}
          {email ? <div className="whitespace-nowrap">{email}</div> : null}
          {phone ? <div className="whitespace-nowrap">{phone}</div> : null}
          {linkedin ? <div className="whitespace-nowrap">{linkedin}</div> : null}
        </div>
      </header>

      <main className="mt-4 space-y-4 font-sans">
        {visibleSkills.length > 0 ? (
          <section>
            <h2 className="mb-2 border-l-[6px] border-slate-900 pl-3 text-[13px] uppercase tracking-[0.9px] text-slate-900">Skills</h2>
            <table className="w-full border-collapse">
              <tbody>
                {visibleSkills.map((skill, index) => (
                  <tr key={`${skill.name}-${index}`} className="border-b border-slate-200 last:border-0">
                    <td className="w-1/2 px-2 py-2 text-[13px] font-semibold">{skill.name}</td>
                    <td className="px-2 py-2 text-right text-[12.5px] text-slate-600">{skill.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {hasEntries(experience, ['title', 'company', 'description']) ? (
          <section>
            <h2 className="mb-2 border-l-[6px] border-slate-900 pl-3 text-[13px] uppercase tracking-[0.9px] text-slate-900">Experience</h2>
            <table className="w-full border-collapse">
              <tbody>
                {experience.map((job, index) => {
                  if (!hasValue(job?.title) && !hasValue(job?.company) && !hasValue(job?.description)) return null
                  return (
                    <tr key={`${job?.title || 'exp'}-${index}`} className="border-b border-slate-200 last:border-0 align-top">
                      <td className="w-[56%] px-2 py-2 text-[13px] font-semibold">{job?.title || 'Job Title'}</td>
                      <td className="px-2 py-2 text-right text-[12.5px] text-slate-600">{job?.company || 'Company'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        ) : null}

        {hasEntries(education, ['degree', 'institution']) ? (
          <section>
            <h2 className="mb-2 border-l-[6px] border-slate-900 pl-3 text-[13px] uppercase tracking-[0.9px] text-slate-900">Education</h2>
            <table className="w-full border-collapse">
              <tbody>
                {education.map((item, index) => {
                  if (!hasValue(item?.degree) && !hasValue(item?.institution)) return null
                  return (
                    <tr key={`${item?.degree || 'edu'}-${index}`} className="border-b border-slate-200 last:border-0 align-top">
                      <td className="w-[56%] px-2 py-2 text-[13px] font-semibold">{item?.degree || 'Degree'}</td>
                      <td className="px-2 py-2 text-right text-[12.5px] text-slate-600">{item?.institution || 'University'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        ) : null}

        {visibleProjects.length > 0 ? (
          <section>
            <h2 className="mb-2 border-l-[6px] border-slate-900 pl-3 text-[13px] uppercase tracking-[0.9px] text-slate-900">Projects</h2>
            <table className="w-full border-collapse">
              <tbody>
                {visibleProjects.map((project, index) => (
                  <tr key={`${project?.name || 'project'}-${index}`} className="border-b border-slate-200 last:border-0 align-top">
                    <td className="w-[56%] px-2 py-2 text-[13px] font-semibold">{project?.name || 'Project Name'}</td>
                    <td className="px-2 py-2 text-right text-[12.5px] text-slate-600">{project?.technologies || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function Template4Preview({ data }) {
  const { name = '', email = '', phone = '', linkedin = '', location = '', objective = '', education = [], experience = [], skills = [], projects = [] } = data

  const visibleSkills = skills.filter((skill) => hasValue(skill?.name))
  const visibleProjects = projects.filter((project) => hasValue(project?.name) || hasValue(project?.description))

  return (
    <div className="h-full w-full bg-white text-slate-900" style={{ padding: '22mm 16mm' }}>
      <header className="border-b-2 border-slate-900 pb-3">
        <h1 className="text-[33px] leading-[1.1] font-semibold tracking-[0.2px]">{name || 'Your Name'}</h1>
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[12.5px] text-slate-600">
          {location ? <span>{location}</span> : null}
          {email ? <span className="text-slate-400">|</span> : null}
          {email ? <span>{email}</span> : null}
          {phone ? <span className="text-slate-400">|</span> : null}
          {phone ? <span>{phone}</span> : null}
          {linkedin ? <span className="text-slate-400">|</span> : null}
          {linkedin ? <span>{linkedin}</span> : null}
        </div>
      </header>

      {objective ? (
        <section className="mt-4 rounded-lg border border-slate-200 px-3 py-3">
          <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Professional Summary</h2>
          <p className="mt-1.5 text-[13px] leading-6 text-slate-700">{objective}</p>
        </section>
      ) : null}

      <main className="mt-4 space-y-4">
        {visibleSkills.length > 0 ? (
          <section>
            <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Core Skills</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleSkills.map((skill, index) => (
                <span key={`${skill.name}-${index}`} className="inline-flex items-baseline gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[12.5px]">
                  <span className="font-semibold">{skill.name}</span>
                  <span className="text-slate-600">{skill.level}</span>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {hasEntries(experience, ['title', 'company', 'description']) ? (
          <section>
            <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Experience</h2>
            <div className="mt-2 space-y-2.5">
              {experience.map((job, index) => {
                if (!hasValue(job?.title) && !hasValue(job?.company) && !hasValue(job?.description)) return null
                return (
                  <article key={`${job?.title || 'exp'}-${index}`} className="flex justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2.5">
                    <div>
                      <div className="text-[13px] font-semibold leading-5">{job?.title || 'Job Title'}</div>
                      {hasValue(job?.description) ? <p className="mt-1 max-w-[420px] text-[12px] leading-5 text-slate-700 whitespace-pre-wrap">{job.description}</p> : null}
                    </div>
                    <div className="whitespace-nowrap text-[12.5px] text-slate-700">{job?.company || 'Company'}</div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {hasEntries(education, ['degree', 'institution']) ? (
          <section>
            <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Education</h2>
            <div className="mt-2 space-y-2.5">
              {education.map((item, index) => {
                if (!hasValue(item?.degree) && !hasValue(item?.institution)) return null
                return (
                  <article key={`${item?.degree || 'edu'}-${index}`} className="flex justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2.5">
                    <div>
                      <div className="text-[13px] font-semibold leading-5">{item?.degree || 'Degree'}</div>
                      {formatRange(item?.startYear, item?.endYear) ? <div className="mt-0.5 text-[12px] text-slate-600">{formatRange(item?.startYear, item?.endYear)}</div> : null}
                    </div>
                    <div className="whitespace-nowrap text-[12.5px] text-slate-700">{item?.institution || 'University'}</div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {visibleProjects.length > 0 ? (
          <section>
            <h2 className="text-[13px] uppercase tracking-[0.8px] text-slate-900">Projects</h2>
            <div className="mt-2 space-y-2.5">
              {visibleProjects.map((project, index) => (
                <article key={`${project?.name || 'project'}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2.5">
                  <div className="text-[13px] font-semibold leading-5">{project?.name || 'Project Name'}</div>
                  {hasValue(project?.technologies) ? <div className="mt-0.5 text-[12px] text-slate-600">{project.technologies}</div> : null}
                  {hasValue(project?.description) ? <p className="mt-1 text-[12px] leading-5 text-slate-700 whitespace-pre-wrap">{project.description}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function TemplateThumbnail({ templateId }) {
  if (templateId === 'template1') {
    return (
      <div className="h-24 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm">
        <div className="h-1.5 w-20 rounded-full bg-slate-900" />
        <div className="mt-2 h-1.5 w-28 rounded-full bg-slate-300" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-slate-200" />
            <div className="h-1.5 w-5/6 rounded-full bg-slate-200" />
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-slate-200" />
            <div className="h-1.5 w-4/6 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (templateId === 'template2') {
    return (
      <div className="h-24 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm">
        <div className="h-1.5 w-18 rounded-full bg-slate-900" />
        <div className="mt-2 flex gap-2">
          <div className="w-7 rounded-md bg-slate-900/90" />
          <div className="flex-1 space-y-1">
            <div className="h-1.5 w-4/5 rounded-full bg-slate-300" />
            <div className="h-1.5 w-3/5 rounded-full bg-slate-200" />
            <div className="h-1.5 w-2/3 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (templateId === 'template3') {
    return (
      <div className="h-24 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 text-left shadow-sm">
        <div className="h-4 w-20 rounded-md bg-gradient-to-r from-purple-600 to-pink-500" />
        <div className="mt-2 h-1.5 w-28 rounded-full bg-slate-300" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="h-8 rounded-lg bg-white shadow-sm" />
          <div className="h-8 rounded-lg bg-white shadow-sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-24 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm">
      <div className="h-1.5 w-20 rounded-full bg-slate-900" />
      <div className="mt-2 h-1.5 w-36 rounded-full bg-slate-300" />
      <div className="mt-3 space-y-1.5">
        <div className="h-1.5 w-full rounded-full bg-slate-200" />
        <div className="h-1.5 w-11/12 rounded-full bg-slate-200" />
        <div className="h-1.5 w-10/12 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}

export default function LivePreview({ templateId, data, onSwitchTemplate }) {
  const preview = useMemo(() => {
    switch (templateId) {
      case 'template1':
        return <Template1Preview data={data} />
      case 'template2':
        return <Template2Preview data={data} />
      case 'template3':
        return <Template3Preview data={data} />
      case 'template4':
        return <Template4Preview data={data} />
      default:
        return <Template1Preview data={data} />
    }
  }, [data, templateId])

  const otherTemplates = TEMPLATE_ORDER.filter((id) => id !== templateId)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-neon-500/10 bg-emerald-950/30 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.22em] text-emerald-100/60">Live Resume Preview</div>
        <div className="mt-1 text-sm font-semibold text-emerald-50">{TEMPLATE_LABELS[templateId] || TEMPLATE_LABELS.template1}</div>
      </div>

      <div className="flex-1 overflow-auto bg-black/20 p-4">
        <div className="mx-auto w-fit max-w-full">
          <div className="overflow-hidden rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/10" style={{ width: '210mm', minHeight: '297mm', maxWidth: '100%' }}>
            {preview}
          </div>
        </div>
      </div>

      <div className="border-t border-neon-500/10 bg-emerald-950/30 p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.22em] text-emerald-100/60">Other Templates</div>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
          {otherTemplates.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSwitchTemplate(id)}
              className="group rounded-2xl border border-neon-500/15 bg-emerald-50/5 p-2 text-left transition-all hover:border-neon-500/40 hover:bg-emerald-50/10"
            >
              <TemplateThumbnail templateId={id} />
              <div className="mt-2 px-1 text-xs font-medium text-emerald-50/80 group-hover:text-emerald-50">
                {TEMPLATE_LABELS[id]}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
