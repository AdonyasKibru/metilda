import React, {Component} from 'react';

import $ from "jquery";
import '../Lib/imgareaselect/css/imgareaselect-default.css';
import '../Lib/imgareaselect/scripts/jquery.imgareaselect.js';

class AudioImg extends Component {
  state = {};

  constructor(props) {
      super(props);
  }

  componentDidMount() {
    const {xminPerc, xmaxPerc} = this.props;

    let audioImage = this;
    let cropAreaLeftX;
    let cropAreaRightX;
    let $el = $("#metilda-audio-analysis-image");
    let imgBox = {xminPerc, xmaxPerc};

    let imgObj = $el.imgAreaSelect({
        instance: true,
        handles: true,
        onInit: function() {
            imgObj.setOptions({minHeight: $el.height()});


            console.log(imgBox);
        },
        onSelectStart: function(img, loc) {
            if (loc.x1 < imgBox.xminPerc * img.width || loc.x2 > imgBox.xmaxPerc * img.width) {
                imgObj.cancelSelection();
            } else {
                cropAreaLeftX = loc.x1;
                cropAreaRightX = loc.x2;
            }
        },
        onSelectChange: function(img, loc) {
            if (cropAreaLeftX !== undefined && cropAreaRightX !== undefined) {
                let isLeftEdgeMovingLeft = loc.x1 < cropAreaLeftX;
                let isRightEdgeMovingRight = loc.x2 > cropAreaRightX;
                let maxWidth;

                if (isLeftEdgeMovingLeft) {
                    let imgLeftX = imgBox.xminPerc * img.width;
                    maxWidth = loc.x2 - imgLeftX;
                } else if (isRightEdgeMovingRight) {
                    let imgRightX = imgBox.xmaxPerc * img.width;
                    maxWidth = imgRightX - loc.x1;
                }

                if (maxWidth !== undefined) {
                    imgObj.setOptions({maxWidth: maxWidth});
                }
            }
        },
        onSelectEnd: function(img, loc) {
            cropAreaLeftX = undefined;
            cropAreaRightX = undefined;

            if (loc.x1 < loc.x2) {
                audioImage.props.letterIntervalSelected(loc.x1, loc.x2);
                imgObj.cancelSelection();
            }
        }
    });
  }

  render() {
    const {uploadId} = this.props;

    return (
      <img id="metilda-audio-analysis-image"
           className="metilda-audio-analysis-image"
           src={"/api/audio-analysis-image/" + uploadId + ".png?faketimestamp=" + Date.now()} />
    );
  }
}

export default AudioImg;