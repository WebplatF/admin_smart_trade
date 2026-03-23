const VideoLibraryModal = ({close}) => {

  const videos = new Array(6).fill(0);

  return(

    <div className="modal-overlay">

      <div className="video-modal">

        <div className="modal-header">

          <h3>Select Video</h3>

          <span onClick={close}>✕</span>

        </div>

        <div className="video-grid">

          {videos.map((_,i)=>(
            <div key={i} className="video-card">

              <div className="video-preview">Preview</div>

              <p>React Course</p>

            </div>
          ))}

        </div>

      </div>

    </div>

  )
}

export default VideoLibraryModal;