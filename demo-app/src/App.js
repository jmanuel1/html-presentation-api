import './App.css';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const downloadAnchor = <a href={`data:text/html,${encodeURIComponent(html)}`} download='presentation.html' style={{display: 'none'}} ref={downloadAnchorRef} aria-hidden>Download HTML Presentation</a>;

  async function exportPresentation() {
    // NOTE: We already have the HTML, and I don't want to configure a proxy to
    // work with a normal URI.
    downloadAnchorRef.current.click();
  }

  async function addSlide() {
    const json = await (await fetch(`/slide/create?presentationID=${presentation.presentationID}&justBefore=${presentation.presentationCursor.justAfter}`)).json();
    appendToSlideArray(json);
  }

  function attachToRevealJS() {
    const Reveal = window.Reveal;
    Reveal.on('slidechanged', event => {
      setCurrentSlideIndex(event.indexh);
    });
  }

  function onTextChange(event) {
    setText(event.target.value);
  }

  async function onSubmitText(event) {
    event.preventDefault();
    const currentSlide = slides[currentSlideIndex];
    const { justBefore, justAfter } = currentSlide.slideCursor;
    const json = await (await fetch(`/text/replace?justBefore=${justBefore}&justAfter=${justAfter}&presentationID=${presentation.presentationID}&text=${text}`));
    currentSlide.contentChildren = json;
    setSlides([...slides]);
  }

  const tryInitializeReveal = useCallback(() => {
    if (window.Reveal && !window.Reveal.isReady()) {
      window.Reveal.initialize({ embedded: true });
      attachToRevealJS();
    }
  }, []);

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
        <button onClick={exportPresentation} type='button'>Export presentation as HTML</button>
        {downloadAnchor}
        <button onClick={addSlide} type='button'>Add new slide</button>
        <label>
          Replace slide content with text:
          <input onChange={onTextChange} value={text} type='text' />
        </label>
        <button onClick={onSubmitText} type='submit'>Submit text</button>
      </form>
      {/* Use something other than iframe since we need to interact with
      content. slides.com doesn't use iframe */}
      {loading ? <p>Loading presentation...</p> : <ArbitraryHTMLDocument html={html} style={{height: '16em'}} afterInsertScript={tryInitializeReveal} shouldInsertScript={shouldInsertScript}></ArbitraryHTMLDocument>}
    </>
  );
}

function shouldInsertScript(element)  {
  return !element.text;
};

const arbitraryHTMLDocumentDefaultProps = {
  afterInsertHTML() { return null; },
  style: {},
  afterInsertScript() { return null; },
  shouldInsertScript() { return true; }
};

function ArbitraryHTMLDocument({
  html,
  afterInsertHTML = arbitraryHTMLDocumentDefaultProps.afterInsertHTML,
  style = arbitraryHTMLDocumentDefaultProps.style,
  afterInsertScript = arbitraryHTMLDocumentDefaultProps.afterInsertScript,
  shouldInsertScript = arbitraryHTMLDocumentDefaultProps.shouldInsertScript
}) {
  const contentRef = useRef();
  const templateRef = useRef();

  useEffect(() => {
    function manipulateHTML(templateElement) {
      const scriptPromises = [];

      const documentFragment = templateElement.content;
      if (contentRef.current) {
        contentRef.current.innerHTML = '';

        for (let child of documentFragment.children) {
          if (child.tagName === 'SCRIPT') {
            if (!shouldInsertScript(child)) {
              continue;
            }
            // https://stackoverflow.com/questions/28771542/why-dont-clonenode-script-tags-execute
            const script = document.createElement('script');
            script.src = child.src;
            if (child.text) {
              script.src = `data:application/javascript,${encodeURIComponent(child.text)}`;
            };
            script.async = child.async;
            script.async = false;
            script.defer = false;
            // https://html.spec.whatwg.org/multipage/scripting.html#execute-the-script-block
            // load event fires after execution for scripts from external files
            // (i.e. any <script> with a src attribute)
            const thenable = {
              then(resolve) {
                this.resolve = resolve;
              }
            };
            script.addEventListener('load', () => {
              thenable.resolve();
              afterInsertScript();
            });
            scriptPromises.push(Promise.resolve(thenable));
            contentRef.current.appendChild(script);
          } else {
            contentRef.current.appendChild(child.cloneNode(true));
          }
        }
      }
      Promise.all(scriptPromises).then(afterInsertHTML);
    }

    templateRef.current && manipulateHTML(templateRef.current);
  }, [html, afterInsertHTML, afterInsertScript, shouldInsertScript]);

  return (
    <>
      <template dangerouslySetInnerHTML={{__html: html}} ref={templateRef}></template>
      <div ref={contentRef} style={style}></div>
    </>
  );
  // const documentFragment =
}

export default App;
