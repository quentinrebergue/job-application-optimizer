// Compact: dense single column, no cards, ruled section titles.
// Reads data.json, written next to this file by the renderer for each request.
// Every value comes from JSON strings, so it is shown as plain text and never
// interpreted as Typst markup.
#let data = json("data.json")
#let profile = data.profile
#let sections = data.sections
#let opts = data.options

#let accent = rgb(opts.accentColor)
#let muted = luma(90)

#set document(title: profile.name + " - Resume", author: profile.name)
#set page(paper: "a4", margin: (x: 1.3cm, y: 1.1cm))
#set text(font: ("Liberation Sans", "Helvetica", "Arial"), size: opts.fontSize * 1pt, lang: "en")
#set par(leading: 0.55em, spacing: 0.6em)

#let lines(s) = s.split("\n").join(linebreak())

#let href(url) = if url.starts-with("http") { url } else { "https://" + url }

// Dates sit right after the title by default ("inline"): a date pushed to the
// far right can be split from its job by ATS parsers that group text by position.
#let heading-line(left, right) = if opts.datePlacement == "right" {
  grid(
    columns: (1fr, auto),
    column-gutter: 1em,
    left,
    text(fill: muted)[#right],
  )
} else if right == "" {
  left
} else {
  [#left #text(fill: muted)[| #right]]
}

#let section(title, items, render) = {
  if items.len() > 0 [
    #block(above: 1em, below: 0.6em, width: 100%, stroke: (bottom: 0.6pt + accent), inset: (bottom: 3pt))[
      #text(weight: "bold", fill: accent, tracking: 0.06em)[#upper(title)]
    ]
    #for item in items [
      #block(breakable: false, below: 0.7em)[#render(item)]
    ]
  ]
}

// Header
#text(size: 2em, weight: "bold")[#profile.name]
#if profile.title != "" [
  #h(0.6em) #text(size: 1.15em, fill: muted)[#profile.title]
]
#{
  let contact = ()
  if profile.email != "" { contact.push(link("mailto:" + profile.email)[#profile.email]) }
  if profile.linkedin != "" { contact.push(link(href(profile.linkedin))[#profile.linkedin]) }
  if profile.phone != "" { contact.push([#profile.phone]) }
  if profile.address != "" { contact.push([#profile.address]) }
  if contact.len() > 0 {
    linebreak()
    text(size: 0.9em, fill: muted)[#contact.join([ #h(0.2em)·#h(0.2em) ])]
  }
}

#if profile.summary != "" [
  #v(0.3em)
  #lines(profile.summary)
]

#section("Work Experience", sections.experiences, e => [
  #heading-line(
    [*#e.title#if e.company != "" [, #e.company]*#if e.location != "" [, #e.location]],
    e.period,
  )
  #if e.description != "" [
    #v(0.15em)
    #text(fill: muted)[#lines(e.description)]
  ]
])

#section("Projects", sections.projects, p => [
  *#p.title*#if p.tech.len() > 0 [ #text(fill: muted)[(#p.tech.join(", "))]]
  #if p.description != "" [ — #lines(p.description)]
])

#section("Education", sections.education, e => [
  #heading-line([*#e.degree*#if e.institution != "" [, #e.institution]], e.period)
])

#section("Technical Expertise", sections.skills, s => [
  *#s.name:* #s.tags.join(", ")
])
