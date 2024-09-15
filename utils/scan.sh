ROTATION=$([ $((RANDOM % 2)) -eq 1 ] && echo -)0.$(($RANDOM % 4 + 5))

convert -density 140 $1 \
  -linear-stretch '1.5%x2%' \
  -rotate ${ROTATION} \
  -attenuate '0.01' \
  +noise  Multiplicative \
	-flatten -attenuate 0.01 \
	+noise  Multiplicative \
	-sharpen 0x1.0 \
  -colorspace Gray $2

# convert -density 140 input.pdf -rotate "$([ $((RANDOM % 2)) -eq 1 ] && echo -)0.$(($RANDOM % 4 + 5))" -attenuate 0.1 +noise Multiplicative -flatten -attenuate 0.01 +noise Multiplicative -sharpen 0x1.0 -colorspace Gray output.pdf
