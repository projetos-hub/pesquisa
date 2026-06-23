'use client'

interface OptionBtnProps {
  label: string
  selected: boolean
  onClick: () => void
}

function Radio() {
  return <span className="radio" aria-hidden="true" />
}

export default function OptionBtn({ label, selected, onClick }: OptionBtnProps) {
  return (
    <button
      type="button"
      className={`option-btn${selected ? ' sel' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <Radio />
      {label}
    </button>
  )
}
