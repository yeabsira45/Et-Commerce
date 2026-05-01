export default function FaqPage() {
  return (
    <div className="container pageGrid">
      <section className="searchSection">
        <h1 className="searchTitle">Frequently Asked Questions</h1>
        <p className="modalSub">
          <strong>How do I post a listing?</strong> Sign in, open the Sell page, fill in details, upload images, and submit.
        </p>
        <p className="modalSub">
          <strong>Why is my listing not visible?</strong> New listings may require moderation approval before appearing in public search.
        </p>
        <p className="modalSub">
          <strong>How do I contact a seller?</strong> Open a listing and use the chat or provided contact options.
        </p>
        <p className="modalSub">
          <strong>How do I report bugs or suggestions?</strong> Use the Feedback option in the header and include clear steps/screenshots if possible.
        </p>
      </section>
    </div>
  );
}

