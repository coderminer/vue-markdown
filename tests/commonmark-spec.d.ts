declare module 'commonmark-spec' {
  export interface CommonMarkExample {
    markdown: string
    html: string
    section: string
    number: number
  }

  const spec: {
    text: string
    tests: CommonMarkExample[]
  }

  export default spec
}
