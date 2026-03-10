'use client'

interface OptionBtnProps {
  label: string
  selected: boolean
  onClick: () => void
}

function Radio() {
  return <span className="radio" />
}

export default function OptionBtn({ label, selected, onClick }: OptionBtnProps) {
  return (
    <button className={`option-btn${selected ? ' sel' : ''}`} onClick={onClick}>
      <Radio />
      {label}
    </button>
  )
}
