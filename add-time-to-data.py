import time

def convert_line_to_numbers(line):
    values = line.strip().split(', ')
    return tuple([float(value) for value in values])

with open('data.txt', 'r') as data_file:
    data = data_file.readlines()

with open('data-with-time.txt', 'w') as new_file:
    for (number, line) in enumerate(data):

#         time.sleep(0.5)
#         data_as_numbers = convert_line_to_numbers(line)
#         print(data_as_numbers)

        new_file.write('{:d}, {}'.format(number + 1, line))