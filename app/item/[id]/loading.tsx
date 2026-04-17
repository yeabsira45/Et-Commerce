export default function ItemLoading() {
  return (
    <div className="itemPage">
      <div className="container itemLayout" aria-hidden="true">
        <div className="itemGallery">
          <div className="itemMainImage itemSkeletonBlock itemSkeletonImage" />
          <div className="itemThumbRow">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`thumb-${index}`} className="itemThumbBtn itemSkeletonBlock itemSkeletonThumb" />
            ))}
          </div>
          <div className="itemSkeletonTitle" />
          <div className="itemSkeletonMeta" />
          <div className="itemSkeletonParagraph">
            <div className="productSkeletonLine productSkeletonLineLg" />
            <div className="productSkeletonLine" />
            <div className="productSkeletonLine productSkeletonLineSm" />
          </div>
          <div className="itemSpecs">
            <h3>Item specifications</h3>
            <ul>
              {Array.from({ length: 6 }).map((_, index) => (
                <li key={`spec-${index}`}>
                  <span className="itemSpecIcon itemSkeletonBlock" />
                  <span className="productSkeletonLine" />
                </li>
              ))}
            </ul>
          </div>
          <div className="itemSafety">
            <h3>Safety tips</h3>
            <ul>
              {Array.from({ length: 4 }).map((_, index) => (
                <li key={`tip-${index}`}>
                  <span className="productSkeletonLine" />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="itemSidebar">
          <div className="itemSidebarSection">
            <div className="itemSellerRow">
              <div className="itemSkeletonBlock itemSkeletonAvatar" />
              <div className="itemSellerMeta">
                <div className="productSkeletonLine productSkeletonLineLg" />
                <div className="productSkeletonLine productSkeletonLineSm" />
              </div>
            </div>
            <div className="itemSkeletonPrice" />
            <div className="itemSkeletonMeta" />
          </div>

          <div className="itemSidebarSection itemSidebarActions">
            <div className="itemSkeletonAction" />
            <div className="itemSkeletonAction" />
            <div className="itemSkeletonAction" />
          </div>

          <div className="itemChatBox itemSidebarSection">
            <div className="itemSkeletonTextarea" />
            <div className="itemSkeletonAction" />
            <div className="itemSkeletonAction" />
          </div>
        </aside>
      </div>
    </div>
  );
}
