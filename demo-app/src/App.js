import './App.css';
import { useEffect, useRef, useState } from 'react';

function App() {
  const [ presentation, setPresentation ] = useState(null);

  async function createPresentation() {
    const json = await (await fetch('/presentation/create')).json();
    setPresentation(json);
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>HTML-based Presentations API Demo</h1>
      </header>
      <main role='main'>
        <button onClick={createPresentation}>Create new presentation</button>
        {presentation && <Presentation presentation={presentation} />}
      </main>
    </div>
  );
}

function Presentation({ presentation }) {
  const [ loading, setLoading ] = useState(true);
  const [ html, setHTML ] = useState('');
  const [ slides, setSlides ] = useState([]);
  function appendToSlideArray(slide) {
    setSlides([...slides, slide]);
  }
  const [ currentSlideIndex, setCurrentSlideIndex ] = useState(0);
  const [ text, setText ] = useState('');

  const downloadAnchorRef = useRef();
  const downloadAnchor = <a href={`data:text/html,${encodeURIComponent(html)}`} download='presentation.html' style={{display: 'none'}} ref={downloadAnchorRef} aria-role='hidden'>Download HTML Presentation</a>;

  async function exportPresentation() {
    // NOTE: We already have the HTML, and I don't want to configure a proxy to
    // work with a normal URI.
    downloadAnchorRef.current.click();
  }

  async function addSlide() {
    const json = await (await fetch(`/slide/create?presentationID=${presentation.presentationID}&justBefore=${presentation.presentationCursor.justAfter}`)).json();
    appendToSlideArray(json);
  }

  function attachToRevealJS(presentationElement) {
    const Reveal = presentationElement.contentWindow.Reveal;
    Reveal.on('slidechanged', event => {
      setCurrentSlideIndex(event.indexh);
    });
  }

  function onTextChange(event) {
    setText(event.target.value);
  }

  async function onSubmitText() {
    const currentSlide = slides[currentSlideIndex];
    const { justBefore, justAfter } = currentSlide.slideCursor;
    const json = await (await fetch(`/text/replace?justBefore=${justBefore}&justAfter=${justAfter}&presentationID=${presentation.presentationID}&text=${text}`));
    currentSlide.contentChildren = json;
    setSlides([...slides]);
  }

  function afterInsertPresentation() {
    window.Reveal.initialize({ embedded: true });
  }

  useEffect(() => {
    setLoading(true);
    (async () => {
      const result = await (await fetch(`/presentation/export/html?presentationID=${presentation.presentationID}`)).text();
      setHTML(result);
      setLoading(false);
    })()
  }, [presentation, slides]);

  return (
    <>
      <form>
        <button onClick={exportPresentation}>Export presentation as HTML</button>
        {downloadAnchor}
        <button onClick={addSlide}>Add new slide</button>
        <label>
          Replace slide content with text:
          <input onChange={onTextChange} value={text} />
        </label>
        <button onClick={onSubmitText} type='submit'>Submit text</button>
      </form>
      {/* Use something other than iframe since we need to interact with
      content. slides.com doesn't use iframe */}
      {loading ? <p>Loading presentation...</p> : <ArbitraryHTMLDocument html={html} afterInsertHTML={afterInsertPresentation}></ArbitraryHTMLDocument>}
    </>
  );
}

function ArbitraryHTMLDocument({ html, afterInsertHTML }) {
  // const [bodyHTML, setBodyHTML] = useState('');
  const contentRef = useRef();
  const templateRef = useRef();

  function manipulateHTML(templateElement) {
    if (!templateElement) { return; }

    const documentFragment = templateElement.content;
    if (contentRef.current) {
      for (let child of documentFragment.children) {
        if (child.tagName === 'SCRIPT') {
          // https://stackoverflow.com/questions/28771542/why-dont-clonenode-script-tags-execute
          const script = document.createElement('script');
          script.src = child.src;
          script.text = child.text;
          script.async = child.async;
          contentRef.current.appendChild(script);
        } else {
          contentRef.current.appendChild(child.cloneNode(true));
        }
      }
    }
    afterInsertHTML();
  }

  useEffect(() => {
    manipulateHTML(templateRef.current);
  });

  return (
    <>
      <template dangerouslySetInnerHTML={{__html: html}} ref={templateRef}></template>
      <div ref={contentRef}></div>
    </>
  );
  // const documentFragment =
}

export default App;
