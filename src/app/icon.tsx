import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const contentType = 'image/png'

export const size = {
  width: 512,
  height: 512,
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: '#2563eb',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '24%',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="256"
          height="256"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m13 2-2 10h3L11 22l2-10h-3l2-10z" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
