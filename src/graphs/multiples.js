//Both of these could go quite a bit faster for large numbers, but it doesn't really matter.
//Our numbers are so small the difference is trivial.

function getPrimeFactors(num) {
	let divisor = 2
	let factors = []

	while (num >= divisor) {
		if (num % divisor === 0) {
			factors.push(divisor)
			num /= divisor
		}
		else {divisor++} //TODO: Even numbers != 2 are clearly not prime.
	}
	return factors
}


function getGCF(nums) {
	if (nums.length === 1) {return nums[0]}

	nums = nums.map(num => getPrimeFactors(num))
	let gcf = 1

	let firstRow = nums[0]
	let rest = nums.slice(1)

	//TODO: Iterating backwards would improve performance greatly, as splicing wouldn't be needed.
	firstRow.forEach((num) => {
		if (rest.every(nums => {
			return nums.includes(num)
		})) {
			gcf *= num
			rest.forEach((nums) => {
				nums.splice(nums.indexOf(num), 1)
			})
		}
	})
	return gcf
}

//TODO: I strongly suspect LCM is quicker to calculate than GCF.
//Perf doesn't matter here though.
function getLCM(nums) {
	if (nums.length === 1) {return nums[0]}

	let gcf = getGCF(nums)
	return nums[0] * (nums[1] / gcf)
}

export {getGCF, getLCM, getPrimeFactors}
