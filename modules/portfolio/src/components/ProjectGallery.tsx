// Foundation, edit with care
// Project case study gallery. react-photo-album for justified grid layout,
// yet-another-react-lightbox for fullscreen viewing with Zoom + Thumbnails.
// Each photo carries its alt text and optional caption from Sanity.

import { useMemo, useState } from 'react';
import { RowsPhotoAlbum, type Photo } from 'react-photo-album';
import 'react-photo-album/rows.css';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/captions.css';

import { urlFor } from '@/lib/sanity';

interface SanityImageItem {
  _key?: string;
  asset?: { _ref?: string; _id?: string };
  alt?: string;
  caption?: string;
}

interface Props {
  images: SanityImageItem[];
}

// Default dimensions if Sanity asset metadata isn't loaded.
const DEFAULT_W = 1600;
const DEFAULT_H = 1066;

export default function ProjectGallery({ images }: Props) {
  const [index, setIndex] = useState(-1);

  const photos: Photo[] = useMemo(() => {
    return images
      .filter((img) => img.asset)
      .map((img) => {
        const thumbUrl  = urlFor(img).width(800).quality(70).format('webp').url();
        const thumb2x   = urlFor(img).width(1600).quality(70).format('webp').url();
        return {
          src: thumbUrl,
          srcSet: [{ src: thumb2x, width: 1600, height: 1066 }],
          width: DEFAULT_W,
          height: DEFAULT_H,
          alt: img.alt ?? '',
          title: img.caption,
        };
      });
  }, [images]);

  const slides = useMemo(() => {
    return images
      .filter((img) => img.asset)
      .map((img) => ({
        src: urlFor(img).width(2400).quality(85).format('webp').url(),
        alt: img.alt ?? '',
        description: img.caption,
      }));
  }, [images]);

  if (photos.length === 0) return null;

  return (
    <>
      <RowsPhotoAlbum
        photos={photos}
        targetRowHeight={280}
        spacing={12}
        onClick={({ index: i }) => setIndex(i)}
      />
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={slides}
        plugins={[Zoom, Thumbnails, Captions]}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        thumbnails={{ position: 'bottom' }}
      />
    </>
  );
}
