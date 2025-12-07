import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { TONE_OPTIONS, Tone, DEFAULT_TONE } from '@/constants/tone';

interface ToneSelectorProps {
  selectedTone: Tone;
  onToneChange: (tone: Tone) => void;
}

export default function ToneSelector({ selectedTone, onToneChange }: ToneSelectorProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        返信のトーンを選択
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {TONE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <Tooltip
              key={option.value}
              title={option.description}
              arrow
              placement="top"
            >
              <Chip
                icon={<Icon />}
                label={option.label}
                onClick={() => onToneChange(option.value)}
                color={selectedTone === option.value ? 'primary' : 'default'}
                variant={selectedTone === option.value ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: selectedTone === option.value ? 600 : 400,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                  },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
